import { Link } from "wouter";
import { AlertTriangle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="flex justify-center mb-6">
          <AlertTriangle className="h-16 w-16 text-orange-500" />
        </div>
        <h1 className="text-4xl font-bold text-gray-900 mb-4">404 Page Not Found</h1>
        <p className="text-lg text-gray-600 mb-8">
          The fishing spot you are looking for has moved or doesn't exist.
        </p>
        <Link href="/">
          <a className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors">
            Return Home
          </a>
        </Link>
      </div>
    </div>
  );
}
