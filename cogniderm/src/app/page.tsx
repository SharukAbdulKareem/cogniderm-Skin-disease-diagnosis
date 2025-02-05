import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      <header className="p-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-purple-500">CogniDerm</h1>
        <nav>
          <Link href="/diagnosis" className="text-gray-300 hover:text-white mr-4">
            Detect Skin
          </Link>
          <Link href="/chat" className="text-gray-300 hover:text-white">
            Chat
          </Link>
        </nav>
      </header>
      
      <main className="flex-grow flex flex-col items-center justify-center text-center px-4">
        <h2 className="text-4xl font-bold mb-4">Welcome to CogniDerm</h2>
        <p className="mb-8 max-w-2xl">
          Advanced AI-powered skin disease detection at your fingertips. Upload
          an image and get instant analysis and personalized insights.
        </p>
        <div className="space-x-4">
          <Link 
            href="/diagnosis" 
            className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded"
          >
            Start Diagnosis
          </Link>
          <Link 
            href="/chat" 
            className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
          >
            Chat with AI
          </Link>
        </div>
      </main>
    </div>
  );
}
