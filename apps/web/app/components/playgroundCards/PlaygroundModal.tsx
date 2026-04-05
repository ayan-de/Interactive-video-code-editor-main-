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
      <DialogContent className="bg-gray-900 border-gray-700 text-white">
        <DialogHeader>
          <DialogTitle className="text-white">
            New Recording Session
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Enter a title for your recording session to get started.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Session title..."
            className="px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="text-gray-400 hover:text-white"
            >
              Cancel
            </Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white"
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
