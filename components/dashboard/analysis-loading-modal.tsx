'use client';

import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogHeader } from '@/components/ui/dialog';
import { Check, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const STEPS = [
  { id: 'crawler', label: 'Booting our crawler...' },
  { id: 'result', label: 'Processing the result...' },
  { id: 'extracting', label: 'Extracting the transcripts...' },
  { id: 'analyzing', label: 'Analyzing content with AI...' },
];

interface AnalysisLoadingModalProps {
  isOpen: boolean;
  currentStepIndex: number;
}

export function AnalysisLoadingModal({ isOpen, currentStepIndex }: AnalysisLoadingModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md bg-[#0a0f16]/95 border-white/5 backdrop-blur-2xl p-8 rounded-[32px] shadow-2xl outline-none select-none [&>button]:hidden">
        <div className="space-y-8 py-4">
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-2xl font-bold text-white tracking-tight">
              We are fetching the Transcript
            </DialogTitle>
            <DialogDescription className="text-zinc-400 text-sm font-medium">
              Sit back, this usually takes a few seconds.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            {STEPS.map((step, index) => {
              const isCompleted = index < currentStepIndex;
              const isActive = index === currentStepIndex;

              return (
                <div key={step.id} className="flex items-center gap-4 transition-all duration-200">
                  <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center">
                    <AnimatePresence mode="wait">
                      {isCompleted ? (
                        <motion.div
                          key="completed"
                          initial={{ scale: 0.5, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ duration: 0.2 }}
                          className="flex items-center justify-center w-full h-full"
                        >
                          <Check className="w-5 h-5 text-emerald-400 stroke-[3px]" />
                        </motion.div>
                      ) : isActive ? (
                        <motion.div
                          key="active"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.2 }}
                          className="flex items-center justify-center w-full h-full"
                        >
                          <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                        </motion.div>
                      ) : (
                        <div key="pending" className="w-2 h-2 rounded-full bg-zinc-800 ml-1.5" />
                      )}
                    </AnimatePresence>
                  </div>
                  <span
                    className={`text-lg font-semibold transition-all duration-200 tracking-tight ${
                      isActive ? 'text-white' : isCompleted ? 'text-zinc-500' : 'text-zinc-700'
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Progress Indicator Dots */}
          <div className="flex gap-1.5 pt-2">
            {[0, 1, 2, 3].map((i) => (
              <div 
                key={i} 
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i <= currentStepIndex ? 'w-8 bg-blue-500' : 'w-1.5 bg-zinc-800'
                }`} 
              />
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
