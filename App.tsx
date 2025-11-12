
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { editImage, generateSpeech } from './services/geminiService';
import { useAudioPlayer } from './hooks/useAudioPlayer';

// --- Helper & Icon Components (defined outside to prevent re-renders) ---

const SpinnerIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={`animate-spin ${className}`}
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    ></circle>
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    ></path>
  </svg>
);

const UploadIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
    </svg>
);

const SpeakerIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z" />
    </svg>
);

const DownloadIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
    </svg>
);


// --- Main App Component ---

export default function App() {
  const [originalImage, setOriginalImage] = useState<{ data: string; mimeType: string; } | null>(null);
  const [editedImage, setEditedImage] = useState<string | null>(null);
  const [prompt, setPrompt] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [currentInstruction, setCurrentInstruction] = useState<string>('');
  
  const { playAudio, isPlaying } = useAudioPlayer();
  const lastInstructionSpoken = useRef<string>('');
  
  const speakInstruction = useCallback(async (text: string) => {
    if (text && text !== lastInstructionSpoken.current && !isPlaying) {
      try {
        lastInstructionSpoken.current = text;
        const audioData = await generateSpeech(text);
        if (audioData) {
          await playAudio(audioData);
        }
      } catch (e) {
        console.error("Failed to generate or play speech:", e);
      }
    }
  }, [playAudio, isPlaying]);

  useEffect(() => {
    const initialInstruction = "Welcome to the AI Photo Editor. Please upload an image to begin.";
    setCurrentInstruction(initialInstruction);
  }, []);

  useEffect(() => {
      speakInstruction(currentInstruction);
  }, [currentInstruction, speakInstruction]);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setOriginalImage({ data: base64String.split(',')[1], mimeType: file.type });
        setEditedImage(null);
        setError(null);
        setCurrentInstruction("Great! Now, describe the changes you want to make in the text box below.");
      };
      reader.onerror = () => {
        setError("Failed to read the image file.");
        setCurrentInstruction("Oops, something went wrong while reading the image file. Please try again.");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!originalImage || !prompt || isLoading) {
      return;
    }

    setIsLoading(true);
    setError(null);
    setCurrentInstruction("Processing your request. This may take a moment.");

    try {
      const result = await editImage(originalImage.data, originalImage.mimeType, prompt);
      if(result) {
        setEditedImage(result);
        setCurrentInstruction("Here is your edited image! You can download it using the button next to the title.");
      } else {
        throw new Error("The editing process returned no image.");
      }
    } catch (e: any) {
      console.error(e);
      setError(`An error occurred: ${e.message}`);
      setCurrentInstruction("Sorry, an error occurred while editing your image. Please check the prompt and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    if (editedImage) {
      const link = document.createElement('a');
      link.href = `data:image/png;base64,${editedImage}`;
      link.download = 'edited-image.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setCurrentInstruction("Your image has been downloaded.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col items-center p-4 sm:p-6 lg:p-8">
      <main className="w-full max-w-4xl mx-auto space-y-8">
        <header className="text-center">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
            AI Photo Editor
          </h1>
          <p className="mt-2 text-lg text-gray-400">Edit images with text, guided by voice.</p>
        </header>

        <div className="bg-gray-800 p-4 rounded-lg shadow-lg flex items-center justify-between space-x-4">
            <p className="text-gray-300 flex-grow">{currentInstruction}</p>
            <button 
                onClick={() => speakInstruction(currentInstruction)} 
                disabled={isPlaying}
                className="p-2 rounded-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-800"
                aria-label="Repeat instruction"
            >
                <SpeakerIcon className={`h-6 w-6 text-white ${isPlaying ? 'animate-pulse' : ''}`} />
            </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Left Column: Upload and Original Image */}
          <div className="space-y-4">
             <div className="bg-gray-800 p-6 rounded-lg shadow-lg h-full flex flex-col items-center justify-center">
                {!originalImage ? (
                    <label htmlFor="image-upload" className="w-full h-64 border-2 border-dashed border-gray-600 rounded-lg flex flex-col items-center justify-center text-center cursor-pointer hover:border-purple-500 hover:bg-gray-700 transition-colors">
                        <UploadIcon />
                        <span className="mt-2 text-gray-400">Click to upload an image</span>
                        <input id="image-upload" type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                    </label>
                ) : (
                    <div className="w-full">
                        <h2 className="text-xl font-semibold mb-4 text-center">Original Image</h2>
                        <img src={`data:${originalImage.mimeType};base64,${originalImage.data}`} alt="Original upload" className="w-full h-auto object-contain rounded-lg shadow-md max-h-96" />
                         <label htmlFor="image-upload" className="mt-4 block w-full text-center py-2 px-4 bg-gray-700 hover:bg-gray-600 rounded-md cursor-pointer transition-colors">
                            Change Image
                            <input id="image-upload" type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                        </label>
                    </div>
                )}
             </div>
          </div>

          {/* Right Column: Prompt and Edited Image */}
          <div className="space-y-4">
            <form onSubmit={handleSubmit} className="bg-gray-800 p-6 rounded-lg shadow-lg">
              <h2 className="text-xl font-semibold mb-4">Editing Prompt</h2>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g., Add a retro filter, make the sky blue, remove the person in the background..."
                disabled={!originalImage || isLoading}
                className="w-full p-3 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
                rows={4}
              />
              <button
                type="submit"
                disabled={!originalImage || !prompt || isLoading}
                className="mt-4 w-full flex items-center justify-center py-3 px-4 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-md transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
              >
                {isLoading ? <><SpinnerIcon className="h-5 w-5 mr-2"/> Processing...</> : 'Generate Edit'}
              </button>
            </form>
            
            <div className="bg-gray-800 p-6 rounded-lg shadow-lg min-h-[200px] flex items-center justify-center">
                {isLoading ? (
                    <div className="text-center">
                        <SpinnerIcon className="h-10 w-10 mx-auto text-purple-400"/>
                        <p className="mt-4 text-gray-400">Editing your photo...</p>
                    </div>
                ) : editedImage ? (
                    <div className="w-full">
                        <div className="flex justify-center items-center mb-4 gap-4">
                           <h2 className="text-xl font-semibold">Edited Image</h2>
                           <button 
                                onClick={handleDownload} 
                                className="p-2 rounded-full bg-green-600 hover:bg-green-700 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-gray-800" 
                                aria-label="Download image"
                            >
                               <DownloadIcon className="h-5 w-5 text-white" />
                           </button>
                        </div>
                        <img src={`data:image/png;base64,${editedImage}`} alt="Edited result" className="w-full h-auto object-contain rounded-lg shadow-md max-h-96" />
                    </div>
                ) : (
                    <p className="text-gray-500">Your edited image will appear here.</p>
                )}
            </div>
          </div>
        </div>

        {error && (
            <div className="bg-red-900/50 border border-red-500 text-red-300 p-4 rounded-lg text-center">
                <strong>Error:</strong> {error}
            </div>
        )}
      </main>
    </div>
  );
}
