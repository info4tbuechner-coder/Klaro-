
import React, { useState, memo } from 'react';
import { useAppDispatch } from '../context/AppContext';
import { Bot, Shield, BrainCircuit, Globe, ArrowRight, Check, Languages, Coins, User } from 'lucide-react';
import { Button, Input, Select, FormGroup } from './ui';

const OnboardingStep: React.FC<{
    title: string;
    description: string;
    icon: React.ReactNode;
    children?: React.ReactNode;
    onNext: () => void;
    nextLabel?: string;
    isLast?: boolean;
}> = ({ title, description, icon, children, onNext, nextLabel = "Weiter", isLast }) => (
    <div className="flex flex-col items-center text-center animate-in p-6 sm:p-12 h-full justify-between">
        <div className="space-y-8 flex flex-col items-center max-w-md">
            <div className="w-24 h-24 bg-primary/10 rounded-[2.5rem] flex items-center justify-center text-primary shadow-2xl border border-primary/20 transform rotate-6 animate-pulse">
                {icon}
            </div>
            <div className="space-y-4">
                <h1 className="text-3xl sm:text-5xl font-black uppercase tracking-tighter leading-tight">{title}</h1>
                <p className="text-muted-foreground text-sm sm:text-lg leading-relaxed">{description}</p>
            </div>
            <div className="w-full text-left">
                {children}
            </div>
        </div>
        
        <Button 
            onClick={onNext} 
            variant="primary" 
            className="w-full max-w-sm mt-12 py-6 text-sm lg:text-base flex items-center justify-center gap-4"
        >
            {isLast ? "Loslegen" : nextLabel}
            {!isLast && <ArrowRight size={20} />}
            {isLast && <Check size={20} />}
        </Button>
    </div>
);

const Onboarding: React.FC = () => {
    const dispatch = useAppDispatch();
    const [step, setStep] = useState(0);
    const [name, setName] = useState('');
    const [currency, setCurrency] = useState('EUR');
    const [language, setLanguage] = useState('de');

    const handleComplete = () => {
        if (navigator.vibrate) navigator.vibrate([10, 30, 50]);
        dispatch({ type: 'UPDATE_USER_PROFILE', payload: { name: name || 'Finanzprofi', currency, language } });
        dispatch({ type: 'COMPLETE_ONBOARDING' });
    };

    const steps = [
        {
            title: "Willkommen bei Klaro",
            description: "Deine Finanzen. Deine Kontrolle. Deine Intelligenz. Klaro ist dein persönlicher Finanzbegleiter für das Web von morgen.",
            icon: <Bot size={48} />,
        },
        {
            title: "Offline-First Privacy",
            description: "Deine Daten gehören dir. Alles wird primär lokal auf deinem Gerät gespeichert. Keine Cloud, kein Tracking, absolute Privatsphäre.",
            icon: <Shield size={48} />,
        },
        {
            title: "KI-Powered",
            description: "Nutze den Smart Scan, um Belege per Foto zu erfassen. Unsere KI erkennt Beträge, Händler und Kategorien automatisch.",
            icon: <BrainCircuit size={48} />,
        },
        {
            title: "Initiales Setup",
            description: "Lass uns kurz die Basis für dein Erlebnis legen. Du kannst das alles später jederzeit in deinem Profil ändern.",
            icon: <User size={48} />,
            content: (
                <div className="space-y-6 animate-in">
                    <FormGroup label="Wie sollen wir dich nennen?" htmlFor="on-name">
                        <Input 
                            id="on-name"
                            value={name} 
                            onChange={e => setName(e.target.value)} 
                            placeholder="Dein Name" 
                            className="bg-background/40"
                        />
                    </FormGroup>
                    <div className="grid grid-cols-2 gap-4">
                        <FormGroup label="Währung" htmlFor="on-cur">
                            <Select 
                                id="on-cur"
                                value={currency} 
                                onChange={e => setCurrency(e.target.value)}
                                className="bg-background/40"
                            >
                                <option value="EUR">€ EUR</option>
                                <option value="USD">$ USD</option>
                                <option value="GBP">£ GBP</option>
                                <option value="CHF">CHF</option>
                            </Select>
                        </FormGroup>
                        <FormGroup label="Sprache" htmlFor="on-lang">
                            <Select 
                                id="on-lang"
                                value={language} 
                                onChange={e => setLanguage(e.target.value)}
                                className="bg-background/40"
                            >
                                <option value="de">Deutsch</option>
                                <option value="en">English</option>
                            </Select>
                        </FormGroup>
                    </div>
                </div>
            )
        }
    ];

    const current = steps[step];

    return (
        <div className="fixed inset-0 z-[200] bg-background-start overflow-hidden flex flex-col">
            <div className="blob-container opacity-20">
                <div className="blob bg-primary/20"></div>
                <div className="blob blob-2 bg-blue-500/10"></div>
            </div>
            
            <div className="flex-grow container mx-auto flex items-center justify-center px-4">
                <OnboardingStep 
                    title={current.title}
                    description={current.description}
                    icon={current.icon}
                    onNext={step === steps.length - 1 ? handleComplete : () => setStep(s => s + 1)}
                    isLast={step === steps.length - 1}
                >
                    {current.content}
                </OnboardingStep>
            </div>

            {/* Progress Indicator */}
            <div className="p-8 flex justify-center gap-3">
                {steps.map((_, i) => (
                    <div 
                        key={i} 
                        className={`h-1.5 rounded-full transition-all duration-700 ${i === step ? 'w-12 bg-primary' : 'w-4 bg-foreground/10'}`}
                    ></div>
                ))}
            </div>
        </div>
    );
};

export default Onboarding;
