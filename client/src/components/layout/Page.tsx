import { ReactNode } from 'react';
import { Link } from 'wouter';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PageProps {
  title: string;
  description?: string;
  children: ReactNode;
  backLink?: string;
  backLinkText?: string;
  actions?: ReactNode;
}

export function Page({
  title,
  description,
  children,
  backLink,
  backLinkText = 'Back',
  actions,
}: PageProps) {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col space-y-2 md:flex-row md:justify-between md:space-y-0">
        <div className="flex flex-col space-y-1">
          {backLink && (
            <Link href={backLink}>
              <Button variant="ghost" className="mb-2 p-0 h-auto text-sm flex items-center text-muted-foreground hover:text-primary">
                <ArrowLeft className="mr-1 h-4 w-4" />
                {backLinkText}
              </Button>
            </Link>
          )}
          <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
          {description && (
            <p className="text-muted-foreground">{description}</p>
          )}
        </div>
        {actions && (
          <div className="flex items-center space-x-2">
            {actions}
          </div>
        )}
      </div>
      {children}
    </div>
  );
}