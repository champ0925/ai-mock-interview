import React from 'react';

interface Props {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  hover?: boolean;
  padding?: number | string;
}

const GlassCard: React.FC<Props> = ({
  children,
  className = '',
  style = {},
  hover = false,
  padding = 32,
}) => {
  const [hovered, setHovered] = React.useState(false);

  return (
    <div
      className={`glass-card${hover ? ' card-hover' : ''} ${className}`}
      onMouseEnter={() => hover && setHovered(true)}
      onMouseLeave={() => hover && setHovered(false)}
      style={{
        background: 'rgba(255, 255, 255, 0.80)',
        backdropFilter: 'blur(40px) saturate(180%)',
        WebkitBackdropFilter: 'blur(40px) saturate(180%)',
        borderRadius: 24,
        border: '1px solid rgba(255, 255, 255, 0.6)',
        boxShadow: hovered
          ? '0 12px 48px rgba(0,0,0,0.1), 0 4px 12px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.9)'
          : '0 4px 24px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.9)',
        padding,
        transition: 'all 0.3s cubic-bezier(0.25, 0.1, 0.25, 1)',
        transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
        position: 'relative',
        overflow: 'hidden',
        ...style,
      }}
    >
      {children}
    </div>
  );
};

export default GlassCard;