import React, { useState } from 'react';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Key, Eye, EyeOff } from 'lucide-react';
import { userService } from '@/services/userService';
import { useAuth } from '@/context/AuthContext';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ChangePasswordModal({ isOpen, onClose }: ChangePasswordModalProps) {
  const { user } = useAuth();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (!user?.id) return;

    try {
      setIsLoading(true);
      await userService.changePassword(user.id, {
        oldPassword,
        newPassword
      });
      setSuccess('Password changed successfully');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        onClose();
        setSuccess('');
      }, 2000);
    } catch (err: any) {
      const msg = err.response?.data?.message;
      if (Array.isArray(msg)) {
        setError(msg.join(', '));
      } else {
        setError(msg || 'Failed to change password');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Change Password">
      <form onSubmit={handleSubmit} className="space-y-4 py-2">
        <div className="space-y-2">
          <label className="text-sm font-semibold text-white/90">Current Password</label>
          <div className="relative">
            <Input 
              type={showOldPassword ? "text" : "password"} 
              value={oldPassword} 
              onChange={(e) => setOldPassword(e.target.value)} 
              required 
              className="pr-10"
            />
            <button 
              type="button" 
              onClick={() => setShowOldPassword(!showOldPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white focus:outline-none"
            >
              {showOldPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold text-white/90">New Password</label>
          <div className="relative">
            <Input 
              type={showNewPassword ? "text" : "password"} 
              value={newPassword} 
              onChange={(e) => setNewPassword(e.target.value)} 
              required 
              className="pr-10"
            />
            <button 
              type="button" 
              onClick={() => setShowNewPassword(!showNewPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white focus:outline-none"
            >
              {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Must be at least 8 characters, include uppercase, lowercase, number and special character.
          </p>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold text-white/90">Confirm New Password</label>
          <div className="relative">
            <Input 
              type={showConfirmPassword ? "text" : "password"} 
              value={confirmPassword} 
              onChange={(e) => setConfirmPassword(e.target.value)} 
              required 
              className="pr-10"
            />
            <button 
              type="button" 
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white focus:outline-none"
            >
              {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
        
        {error && <div className="text-sm text-destructive font-medium bg-destructive/10 p-3 rounded-md border border-destructive/20">{error}</div>}
        {success && <div className="text-sm text-green-500 font-medium bg-green-500/10 p-3 rounded-md border border-green-500/20">{success}</div>}
        
        <div className="pt-4 flex items-center justify-end border-t border-white/10 space-x-3">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isLoading}>Cancel</Button>
          <Button type="submit" className="h-10 px-6" disabled={isLoading}>
            <Key className="mr-2 h-4 w-4" /> {isLoading ? 'Changing...' : 'Change Password'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
