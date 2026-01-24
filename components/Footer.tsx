
import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="border-t border-gray-800 text-gray-400 py-8 px-4 md:px-12">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
          <div>
            <h4 className="font-bold text-white mb-2">Company</h4>
            <ul>
              <li className="mb-1"><a href="#" className="hover:text-white">About Us</a></li>
              <li className="mb-1"><a href="#" className="hover:text-white">Careers</a></li>
              <li className="mb-1"><a href="#" className="hover:text-white">Press</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-white mb-2">Help</h4>
            <ul>
              <li className="mb-1"><a href="#" className="hover:text-white">Contact Us</a></li>
              <li className="mb-1"><a href="#" className="hover:text-white">Support</a></li>
              <li className="mb-1"><a href="#" className="hover:text-white">FAQ</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-white mb-2">Legal</h4>
            <ul>
              <li className="mb-1"><a href="#" className="hover:text-white">Privacy Policy</a></li>
              <li className="mb-1"><a href="#" className="hover:text-white">Terms of Service</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-white mb-2">Follow Us</h4>
             <div className="flex space-x-4">
                {/* Placeholder for social icons */}
                <a href="#" className="hover:text-white">FB</a>
                <a href="#" className="hover:text-white">TW</a>
                <a href="#" className="hover:text-white">IG</a>
            </div>
          </div>
        </div>
        <div className="text-center text-sm">
          <p>&copy; {new Date().getFullYear()} GlobalDramaVerseGuide. All rights reserved.</p>
          <p className="mt-1">Your personalized gateway to global drama entertainment.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
