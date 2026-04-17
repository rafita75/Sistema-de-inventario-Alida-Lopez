// client/src/components/ui/Card.jsx
import React from 'react';

export default function Card({ children, className = '', hover = true }) {
  return (
    <div className={`card ${hover ? 'hover:shadow-medium' : ''} ${className}`}>
      {children}
    </div>
  );
}

Card.Header = function CardHeader({ children, className = '' }) {
  return <div className={`card-header ${className}`}>{children}</div>;
};

Card.Body = function CardBody({ children, className = '' }) {
  return <div className={`card-body ${className}`}>{children}</div>;
};

Card.Footer = function CardFooter({ children, className = '' }) {
  return <div className={`card-footer ${className}`}>{children}</div>;
};