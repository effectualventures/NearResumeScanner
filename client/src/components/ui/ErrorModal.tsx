import { FiAlertTriangle } from 'react-icons/fi';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface ErrorModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  message: string;
}

export default function ErrorModal({ open, onClose, title, message }: ErrorModalProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center text-destructive">
            <FiAlertTriangle className="text-2xl mr-3" />
            <DialogTitle className="text-xl font-medium">{title}</DialogTitle>
          </div>
          <DialogDescription className="text-near-gray-600">
            {message}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button 
            className="bg-near-gray-200 text-near-gray-800 hover:bg-near-gray-300" 
            onClick={onClose}
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
