import React from 'react';
import './App.css';

function App() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md mx-auto bg-white rounded-xl shadow-md overflow-hidden">
        <div className="p-8">
          <div className="uppercase tracking-wide text-sm text-indigo-500 font-semibold">
            React TypeScript App
          </div>
          <h1 className="mt-2 text-xl leading-tight font-medium text-black">
            Welcome to your new project!
          </h1>
          <p className="mt-2 text-gray-500">
            This is a modern React application built with TypeScript and Tailwind CSS.
            Start building amazing things!
          </p>
          <div className="mt-4">
            <button className="bg-indigo-500 text-white px-4 py-2 rounded hover:bg-indigo-600 transition-colors">
              Get Started
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;