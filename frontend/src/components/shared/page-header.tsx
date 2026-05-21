import { Button } from '@/components/ui/button';

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: { label: string; onClick?: () => void; href?: string };
  children?: React.ReactNode;
}

export function PageHeader({ title, description, action, children }: PageHeaderProps) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        {description && <p className="text-muted-foreground">{description}</p>}
      </div>
      <div className="flex gap-2">
        {children}
        {action && (
          action.href ? (
            <a href={action.href}>
              <Button variant="accent">{action.label}</Button>
            </a>
          ) : (
            <Button variant="accent" onClick={action.onClick}>{action.label}</Button>
          )
        )}
      </div>
    </div>
  );
}
