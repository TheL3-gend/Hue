
import React from 'react';
import { useTheme } from '@contexts/ThemeContext'; // Using alias
import { SunIcon, MoonIcon } from '@components/Icons'; // Using alias

const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className={`p-2 rounded-full focus:outline-none focus:ring-2 transition-colors duration-200
                  ${theme === 'dark' 
                    ? 'bg-gray-700 hover:bg-gray-600 text-yellow-400 focus:ring-yellow-500' 
                    : 'bg-gray-200 hover:bg-gray-300 text-indigo-600 focus:ring-indigo-500'}`}
      aria-label="Toggle theme"
    >
      {theme === 'dark' ? (
        <SunIcon className="w-5 h-5" />
      ) : (
        <MoonIcon className="w-5 h-5" />
      )}
    </button>
  );
};

export default ThemeToggle;