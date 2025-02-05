from langchain.chat_models import ChatOpenAI
from langchain.embeddings import OpenAIEmbeddings
from langchain.chains import LLMChain
from langchain.prompts import PromptTemplate
from langchain.vectorstores import FAISS
import os
from fastapi import FastAPI, Form, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import base64
from tensorflow.keras.models import load_model
from tensorflow.keras.preprocessing import image
from tensorflow.keras.applications.inception_v3 import preprocess_input
import numpy as np
import io
from tensorflow.keras.preprocessing import image as image_module
from pydantic import BaseModel
from typing import List, Optional
import uuid


app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your front-end domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)



embeddings = OpenAIEmbeddings(openai_api_key=openai_api_key)

# Get the directory of the current file (app.py)
current_dir = os.path.dirname(os.path.abspath(__file__))
# Go up one level to reach the project root
project_root = os.path.dirname(current_dir)

# Build the path to Faiss_index
faiss_index_path = os.path.join(project_root, "src", "app", "Faiss_index")
print(f"Looking for FAISS index at: {faiss_index_path}")

if not os.path.exists(faiss_index_path):
    raise FileNotFoundError(f"FAISS index directory not found at {faiss_index_path}")

# Load FAISS index with allow_dangerous_deserialization
db = FAISS.load_local(
    faiss_index_path, embeddings, allow_dangerous_deserialization=True
)

# Update the prompt template to be more focused on specific questions
prompt_template = """You are a skin condition assistant. Answer questions about skin conditions clearly and directly.
Context: {context}
Question: {question}

Important rules:
- Answer ONLY what was asked, don't provide unrequested information
- For symptom questions: list only the visible signs and sensations
- For treatment questions: list only treatment options
- For cause questions: list only causes
- For questions with "explain", "detail", "tell me more": then provide comprehensive information
- Use plain text only, no special characters
- Use everyday language
- If unsure, say "Sorry, I don't have enough information about that."

Answer:
"""

# Initialize the QA chain with focused parameters
qa_chain = LLMChain(
    llm=ChatOpenAI(
        model="gpt-4o", 
        openai_api_key=openai_api_key, 
        max_tokens=500,
        temperature=0.3  # Reduced further for more focused responses
    ),
    prompt=PromptTemplate.from_template(prompt_template),
)

# Load the TensorFlow model for skin disease detection
model_path = os.path.join(current_dir, "inception_model", "final_inception_model_resaved.h5")
model = load_model(model_path)

def preprocess_image(img):
    # Resize the image to 299x299 (required for InceptionV3)
    img = img.resize((299, 299))
    # Convert the image to a numpy array
    img_array = image.img_to_array(img)
    # Expand dimensions to match the model input format
    img_array = np.expand_dims(img_array, axis=0)
    # Preprocess the image (using InceptionV3 preprocessing)
    return preprocess_input(img_array)

# Add new models for chat
class Message(BaseModel):
    role: str
    content: str
    images: Optional[List[str]] = []

class ChatHistory(BaseModel):
    messages: List[Message]

# Add this after your existing initialization code
chat_histories = {}

# Add these new endpoints before your existing endpoints
@app.options("/start_chat")
@app.post("/start_chat")
async def start_chat():
    """Initialize a new chat session"""
    chat_id = str(uuid.uuid4())
    chat_histories[chat_id] = {
        "messages": [
            {
                "role": "assistant",
                "content": "Hello! I'm your skin condition assistant. How can I help you today?",
                "images": []
            }
        ]
    }
    return {"chat_id": chat_id, "messages": chat_histories[chat_id]["messages"]}

@app.post("/get_answer")
async def get_answer(question: str = Form(...), chat_id: str = Form(...)):
    try:
        if chat_id not in chat_histories:
            return JSONResponse(
                status_code=404,
                content={"error": "Chat session not found"}
            )

        # Get relevant documents
        relevant_docs = db.similarity_search(question)
        context = ""
        relevant_images = []

        for d in relevant_docs:
            if d.metadata['type'] == 'text':
                context += '[text]' + d.metadata['original_content']
            elif d.metadata['type'] == 'table':
                context += '[table]' + d.metadata['original_content']
            elif d.metadata['type'] == 'image':
                context += '[image]' + d.page_content
                relevant_images.append(d.metadata['original_content'])

        # Get AI response
        result = qa_chain.run({'context': context, 'question': question})

        # Add new messages to chat history
        chat_histories[chat_id]["messages"].extend([
            {
                "role": "user",
                "content": question,
                "images": []
            },
            {
                "role": "assistant",
                "content": result,
                "images": relevant_images
            }
        ])

        return {"messages": chat_histories[chat_id]["messages"]}
    except Exception as e:
        print(f"Error processing request: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"error": str(e)}
        )

@app.post("/predict")
async def predict(image: UploadFile = File(...)):
    if not image:
        raise HTTPException(status_code=400, detail="No image provided")
    try:
        # Read the image file
        contents = await image.read()
        img = image_module.load_img(io.BytesIO(contents))  # Load the image

        # Preprocess the image
        processed_image = preprocess_image(img)

        # Make prediction
        prediction = model.predict(processed_image)

        # Get the class with the highest probability
        class_idx = np.argmax(prediction, axis=1)[0]
        confidence = float(prediction[0][class_idx])

        # Interpret the result based on class index and confidence threshold
        if confidence < 0.9:
            result = "No Eczema or Psoriasis detected"
        elif class_idx == 0:
            result = "Eczema detected"
        elif class_idx == 1:
            result = "Psoriasis detected"
        else:
            result = "No Eczema or Psoriasis detected"

        return JSONResponse({
            'result': result,
            'confidence': confidence
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=5000)
