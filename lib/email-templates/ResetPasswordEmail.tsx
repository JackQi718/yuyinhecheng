import * as React from 'react';

interface ResetPasswordEmailProps {
  resetUrl: string;
  userName?: string;
}

export const ResetPasswordEmailTemplate: React.FC<ResetPasswordEmailProps> = ({
  resetUrl,
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
      }}>Reset Your Password</h1>
    </div>
    
    <div style={{
      backgroundColor: '#f9fafb',
      padding: '20px',
      borderRadius: '8px',
      marginBottom: '20px',
    }}>
      <p>Dear {userName || 'User'},</p>
      <p>We received a request to reset your password. Click the button below to create a new password:</p>
      
      <div style={{
        textAlign: 'center',
        margin: '30px 0',
      }}>
        <a href={resetUrl} style={{
          backgroundColor: '#4f46e5',
          color: 'white',
          padding: '12px 24px',
          borderRadius: '4px',
          textDecoration: 'none',
          fontWeight: 'bold',
          display: 'inline-block',
        }}>
          Reset Password
        </a>
      </div>
      
      <p>Or, you can copy and paste the following link into your browser:</p>
      <p style={{
        wordBreak: 'break-all',
        color: '#4f46e5',
      }}>
        {resetUrl}
      </p>
      
      <p>This link will expire in 1 hour for security reasons.</p>
      <p>If you did not request a password reset, please ignore this email or contact support if you have concerns.</p>
    </div>
    
    <div style={{
      borderTop: '1px solid #ddd',
      paddingTop: '20px',
      fontSize: '12px',
      color: '#666',
      textAlign: 'center',
    }}>
      <p>&copy; {new Date().getFullYear()} VoiceCanvas. All rights reserved.</p>
    </div>
  </div>
); 