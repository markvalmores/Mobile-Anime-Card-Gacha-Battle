import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'gold';
  size?: 'sm' | 'md' | 'lg';
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  className = '', 
  ...props 
}) => {
  const baseStyle = "relative overflow-hidden font-bold rounded-lg shadow-[0_0_15px_rgba(0,0,0,0.5)] transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variants = {
    primary: "bg-blue-600 hover:bg-blue-500 text-white border-2 border-blue-400 hover:shadow-[0_0_20px_rgba(59,130,246,0.8)]",
    secondary: "bg-slate-700 hover:bg-slate-600 text-slate-100 border-2 border-slate-500",
    danger: "bg-red-600 hover:bg-red-500 text-white border-2 border-red-400 hover:shadow-[0_0_20px_rgba(239,68,68,0.8)]",
    gold: "bg-yellow-600 hover:bg-yellow-500 text-yellow-50 border-2 border-yellow-300 hover:shadow-[0_0_25px_rgba(234,179,8,0.9)]"
  };

  const sizes = {
    sm: "px-3 py-1 text-sm",
    md: "px-6 py-2 text-md",
    lg: "px-8 py-4 text-xl tracking-wider"
  };

  return (
    <button 
      className={`${baseStyle} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      <span className="relative z-10">{children}</span>
      {variant === 'gold' && (
        <div className="absolute inset-0 ur-glint opacity-50 pointer-events-none"></div>
      )}
    </button>
  );
};
