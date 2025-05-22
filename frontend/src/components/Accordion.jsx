import React from "react";

export function Accordion({ title, children, isOpen, onToggle }) {
  return (
    <div className="border-gray-200 transition-ld">
      <button
        onClick={onToggle}
        className="w-full h-[8vh] flex justify-between items-center text-xl font-semibold text-gray-800 py-3 rounded-lg focus:outline-none p-0 m-0"
      >
        <div className="flex flex-row justify-between w-full items-center py-1 m-0">
          <span className="text-gray-200 text-[18px] m-0 pl-4">{title}</span>
          <span className="text-gray-800 dark:text-gray-200 px-3 text-3xl">
            {isOpen ? <i className='bx bx-chevron-down'></i> : <i className='bx bx-chevron-up'></i>}
          </span>
        </div>
      </button>

      <div
        className={`transition-all duration-400 ease-in-out overflow-hidden ${
          isOpen ? "max-h-[999px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="pt-2 bg-white dark:bg-gray-800 pb-2">{children}</div>
      </div>
    </div>
  );
}