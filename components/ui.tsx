
import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export const Modal: React.FC<{ children: React.ReactNode; title: string; onClose: () => void; size?: 'sm' | 'md' | 'lg' | 'xl' }> = ({ children, title, onClose, size = 'md' }) => {
    const sizeClasses = {
        sm: 'lg:max-w-md',
        md: 'lg:max-w-xl',
        lg: 'lg:max-w-2xl',
        xl: 'lg:max-w-4xl',
    };

    useEffect(() => {
        const scrollY = window.scrollY;
        document.body.style.position = 'fixed';
        document.body.style.top = `-${scrollY}px`;
        document.body.style.width = '100%';
        document.body.classList.add('modal-open');
        
        return () => {
            document.body.classList.remove('modal-open');
            document.body.style.position = '';
            document.body.style.top = '';
            document.body.style.width = '';
            window.scrollTo(0, scrollY);
        };
    }, []);

    return (
        <div className="fixed inset-0 z-[200] flex items-end lg:items-center justify-center p-0 lg:p-6" onClick={() => {
            if (navigator.vibrate) navigator.vibrate(10);
            onClose();
        }}>
            <div className="absolute inset-0 bg-background/60 backdrop-blur-xl animate-in fade-in duration-300"></div>
            <div 
                className={`relative w-full glass-card rounded-t-[3rem] lg:rounded-[2.5rem] shadow-4xl border-t border-white/20 lg:border-white/10 ${sizeClasses[size]} animate-in slide-in-from-bottom duration-500 overflow-hidden z-[210] max-h-[94vh] flex flex-col mb-0`} 
                onClick={e => e.stopPropagation()}
            >
                <div className="lg:hidden w-12 h-1.5 bg-foreground/10 rounded-full mx-auto mt-4 mb-1"></div>
                <div className="flex items-center justify-between px-6 lg:px-10 py-5 lg:py-8 border-b border-foreground/5">
                    <h3 className="text-base lg:text-xl font-black uppercase tracking-widest text-foreground/80">{title}</h3>
                    <button onClick={() => {
                        if (navigator.vibrate) navigator.vibrate(10);
                        onClose();
                    }} className="p-3 rounded-2xl hover:bg-secondary/50 text-muted-foreground transition-all active:scale-90">
                        <X className="h-6 w-6" />
                    </button>
                </div>
                <div className="p-6 lg:p-10 overflow-y-auto no-scrollbar pb-[calc(5rem+env(safe-area-inset-bottom,0px))] lg:pb-10">
                    {children}
                </div>
            </div>
        </div>
    );
};

export const FormGroup: React.FC<{children: React.ReactNode, label: string, htmlFor?: string}> = ({children, label, htmlFor}) => (
    <div className="space-y-1.5 lg:space-y-3">
        <label htmlFor={htmlFor} className="block text-[8px] lg:text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground/40 ml-1">{label}</label>
        {children}
    </div>
);

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>((props, ref) => (
    <input 
        {...props} 
        ref={ref} 
        autoComplete="off"
        className={`block w-full bg-secondary/30 border-transparent rounded-xl lg:rounded-[1.5rem] shadow-inner focus:ring-2 focus:ring-primary/20 focus:bg-background px-4 lg:px-6 py-4 text-base font-semibold placeholder:text-muted-foreground/20 transition-all outline-none active:scale-[0.99] ${props.className}`} 
    />
));

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>((props, ref) => (
    <select 
        {...props} 
        ref={ref} 
        className={`block w-full bg-secondary/30 border-transparent rounded-xl lg:rounded-[1.5rem] shadow-inner focus:ring-2 focus:ring-primary/20 focus:bg-background px-4 lg:px-6 py-4 text-base font-semibold transition-all outline-none appearance-none active:scale-[0.99] cursor-pointer ${props.className}`} 
    />
));

export const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & {variant?: 'primary' | 'secondary' | 'destructive'}> = ({children, variant = 'secondary', ...props}) => {
    const baseClasses = "px-6 py-4 rounded-xl lg:rounded-[1.5rem] font-black uppercase text-[10px] tracking-[0.2em] transition-all duration-300 disabled:opacity-30 transform active:scale-95 flex items-center justify-center gap-3 select-none min-h-[52px]";
    const variantClasses = {
        primary: "bg-primary text-primary-foreground shadow-lg shadow-primary/20",
        secondary: "bg-secondary/50 text-foreground border border-white/5",
        destructive: "bg-destructive/10 text-destructive border border-destructive/20"
    };
    
    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        if (navigator.vibrate) {
            if (variant === 'destructive') navigator.vibrate([30, 50, 30]);
            else navigator.vibrate(15);
        }
        if (props.onClick) props.onClick(e);
    };

    return <button {...props} onClick={handleClick} className={`${baseClasses} ${variantClasses[variant]} ${props.className}`}>{children}</button>;
};
