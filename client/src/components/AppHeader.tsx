import { FiFileText } from 'react-icons/fi';

export default function AppHeader() {
  return (
    <header className="bg-near-navy text-white py-4 px-6 shadow-md">
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <FiFileText className="h-8 w-8" />
          <h1 className="text-xl font-semibold">Near Resume Processor</h1>
        </div>
        <div>
          <span className="text-sm opacity-75">Transform resumes for your talent database</span>
        </div>
      </div>
    </header>
  );
}
