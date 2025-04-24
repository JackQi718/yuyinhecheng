import * as React from 'react';

interface VerificationEmailProps {
  verificationUrl: string;
  userName?: string;
}

export const VerificationEmailTemplate: React.FC<VerificationEmailProps> = ({
  verificationUrl,
  userName,
}) => (
  <div style={{
    fontFamily: 'Arial, sans-serif',
    maxWidth: '600px',
    margin: '0 auto',
    padding: '20px',
    color: '#333',
  }}>
    <div style={{
      textAlign: 'center',
      marginBottom: '30px',
    }}>
      <h1 style={{
        color: '#4f46e5',
        marginBottom: '10px',
      }}>Verify Your Email</h1>
    </div>
    
    <div style={{
      backgroundColor: '#f9fafb',
      padding: '20px',
      borderRadius: '8px',
      marginBottom: '20px',
    }}>
      <p>Dear {userName || 'User'},</p>
      <p>Thank you for registering with VoiceCanvas. Please click the button below to verify your email address:</p>
      
      <div style={{
        textAlign: 'center',
        margin: '30px 0',
      }}>
        <a href={verificationUrl} style={{
          backgroundColor: '#4f46e5',
          color: 'white',
          padding: '12px 24px',
          borderRadius: '4px',
          textDecoration: 'none',
          fontWeight: 'bold',
          display: 'inline-block',
        }}>
          Verify Email
        </a>
      </div>
      
      <p>Or, you can copy and paste the following link into your browser:</p>
      <p style={{
        wordBreak: 'break-all',
        color: '#4f46e5',
      }}>
        {verificationUrl}
      </p>
      
      <p>This link will expire in 24 hours.</p>
    </div>
    
    <div style={{
      borderTop: '1px solid #ddd',
      paddingTop: '20px',
      fontSize: '12px',
      color: '#666',
      textAlign: 'center',
    }}>
      <p>If you did not request this verification, please ignore this email.</p>
      <p>&copy; {new Date().getFullYear()} VoiceCanvas. All rights reserved.</p>
    </div>
  </div>
); 