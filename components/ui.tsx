
import React from 'react';
import { X } from 'lucide-react';

export const Modal: React.FC<{ children: React.ReactNode; title: string; onClose: () => void; size?: 'sm' | 'md' | 'lg' | 'xl' }> = ({ children, title, onClose, size = 'md' }) => {
    const sizeClasses = {
        sm: 'sm:max-w-sm',
        md: 'sm:max-w-md',
        lg: 'sm:max-w-lg',
        xl: 'sm:max-w-xl',
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in-backdrop" onClick={onClose}>
            <div className={`relative w-full mx-4 glass-card rounded-2xl shadow-xl ${sizeClasses[size]} animate-zoom-in-modal`} onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between p-4 border-b border-border/20">
                    <h3 className="text-lg font-semibold">{title}</h3>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-secondary" aria-label="Schließen">
                        <X className="h-5 w-5" />
                    </button>
                </div>
                <div className="p-6 max-h-[80vh] overflow-y-auto">
                    {children}
                </div>
            </div>
        </div>
    );
};

export const FormGroup: React.FC<{children: React.ReactNode, label: string, htmlFor?: string}> = ({children, label, htmlFor}) => (
    <div>
        <label htmlFor={htmlFor} className="block text-sm font-medium mb-1.5 text-muted-foreground">{label}</label>
        {children}
    </div>
);

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>((props, ref) => (
    <input 
        {...props} 
        ref={ref} 
        className={`block w-full bg-secondary border-border rounded-lg shadow-sm focus:ring-2 focus:ring-primary focus:border-primary px-3 py-2 ${props.className}`} 
    />
));

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>((props, ref) => (
    <select 
        {...props} 
        ref={ref} 
        className={`block w-full bg-secondary border-border rounded-lg shadow-sm focus:ring-2 focus:ring-primary focus:border-primary px-3 py-2 ${props.className}`} 
    />
));

export const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & {variant?: 'primary' | 'secondary' | 'destructive'}> = ({children, variant = 'secondary', ...props}) => {
    const baseClasses = "px-4 py-2 rounded-lg font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-95";
    const variantClasses = {
        primary: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-md hover:shadow-lg",
        secondary: "border border-border bg-transparent hover:bg-secondary",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90"
    };
    return <button {...props} className={`${baseClasses} ${variantClasses[variant]} ${props.className}`}>{children}</button>;
};