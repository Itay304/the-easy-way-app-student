export default function Card({ padding = 'p-4', className = '', children, ...rest }) {
  return (
    <div className={`rounded-2xl bg-gradient-to-b from-white to-gray-50 shadow-lg ${padding} ${className}`} {...rest}>
      {children}
    </div>
  );
}
