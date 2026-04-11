'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { useState } from 'react';

interface PlaygroundModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStartRecording: (title: string) => void;
}

export default function PlaygroundModal({
  open,
  onOpenChange,
  onStartRecording,
}: PlaygroundModalProps) {
  const [title, setTitle] = useState('');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-background border-border text-foreground">
        <DialogHeader>
          <DialogTitle className="text-foreground">
            New Recording Session
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Enter a title for your recording session to get started.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Session title..."
            className="px-3 py-2 bg-input border border-border rounded-md text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />

          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="text-muted-foreground hover:text-foreground"
            >
              Cancel
            </Button>
            <Button
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={() => {
                const trimmed = title.trim();
                if (!trimmed) return;
                onOpenChange(false);
                onStartRecording(trimmed);
                setTitle('');
              }}
            >
              Start Recording
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
