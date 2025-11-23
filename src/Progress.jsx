export default function Progress({ score }) {
  const color = score > 85 ? 'bg-green-500' : score > 60 ? 'bg-yellow-500' : 'bg-red-500';
  
  return (
    <div>
      <div className="w-full bg-gray-600 rounded-full h-4">
        <div 
          className={`${color} h-4 rounded-full transition-all`}
          style={{ width: `${score}%` }}
        />
      </div>
      <p className="text-sm mt-1 text-gray-400">{score}% Mastery</p>
    </div>
  );
}