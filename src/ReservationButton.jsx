export default function ReservationButton({ children, className, onClick }) {
  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        onClick?.();
        window.alert('준비중입니다.');
      }}
    >
      {children}
    </button>
  );
}
