import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

function ScrollToTop() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    // If there's a hash, we want the browser to jump to the anchor, not to the top
    if (hash) return;

    // Use a small timeout to ensure the new page DOM has rendered before scrolling
    const timer = setTimeout(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      document.documentElement.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      document.body.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }, 10);

    return () => clearTimeout(timer);
  }, [pathname, hash]);

  return null;
}

export default ScrollToTop;
