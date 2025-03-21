export const rippleEffect = (e: React.MouseEvent<HTMLElement>) => {
  // Add ripple effect on click
  const element = e.currentTarget;
  const ripple = document.createElement("span");
  const rect = element.getBoundingClientRect();

  const size = Math.max(rect.width, rect.height);
  const x = e.clientX - rect.left - size / 2;
  const y = e.clientY - rect.top - size / 2;

  ripple.style.width = ripple.style.height = `${size}px`;
  ripple.style.left = `${x}px`;
  ripple.style.top = `${y}px`;
  ripple.className =
    "absolute rounded-full bg-gray-200 opacity-60 transform scale-0 animate-ripple pointer-events-none";

  element.appendChild(ripple);

  setTimeout(() => {
    ripple.remove();
  }, 600);
};

export const checkboxRippleEffect = (e: React.MouseEvent<HTMLElement>) => {
  // Add ripple effect on click for small elements like checkboxes
  const element = e.currentTarget;
  const ripple = document.createElement("span");

  // For small elements, center the ripple and make it larger than the element
  ripple.style.width = ripple.style.height = "16px"; // Fixed size for consistency
  ripple.style.left = "50%";
  ripple.style.top = "50%";
  ripple.style.transform = "translate(-50%, -50%)";

  ripple.className =
    "absolute rounded-full bg-gray-300 opacity-70 animate-checkbox-ripple pointer-events-none";

  element.appendChild(ripple);

  setTimeout(() => {
    ripple.remove();
  }, 400);
};
