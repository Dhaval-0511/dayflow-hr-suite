import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const NotFound: React.FC = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background">
      <h1 className="text-6xl font-bold text-muted-foreground mb-4">404</h1>
      <p className="text-xl text-foreground mb-2">Page not found</p>
      <p className="text-muted-foreground text-sm mb-6">The page you're looking for doesn't exist.</p>
      <Button onClick={() => navigate('/dashboard')} className="bg-purple-600 hover:bg-purple-700">
        Go to Dashboard
      </Button>
    </div>
  );
};

export default NotFound;
