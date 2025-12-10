import React from 'react';

const ScannerPage: React.FC = () => {
  return (
    <div style={{ height: '100vh', width: '100%' }}>
      <iframe
        src="/fingerprint/index.html"
        title="Fingerprint Scanner"
        style={{ width: '100%', height: '100%', border: 'none' }}
      ></iframe>
    </div>
  );
};

export default ScannerPage;
