/**
 * File Upload Utilities
 * Handles file uploads to S3 via presigned URLs
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://7j7y34kk48.execute-api.us-east-1.amazonaws.com/v1';

export interface PresignedUrlRequest {
  filename: string;
  user_id: string;
  conversation_id?: string;
}

export interface PresignedUrlResponse {
  url: string;
  upload_path: string;
  filename: string;
  conversation_id: string;
}

export interface FileAttachment {
  file: File;
  uploadPath: string;
  filename: string;
  conversationId: string;
  previewUrl?: string; // For image previews
  type: string; // file MIME type
}

/**
 * Get authentication headers from session storage
 */
function getAuthHeaders(): Record<string, string> {
  if (typeof window === 'undefined') {
    throw new Error('Cannot access sessionStorage on server');
  }

  const accessToken = sessionStorage.getItem('accessToken');
  
  if (!accessToken) {
    throw new Error('No authentication token found. Please log in.');
  }

  return {
    'Content-Type': 'application/json',
    'Authorization': `bearer ${accessToken}`,
  };
}

/**
 * Get user email from session storage
 */
function getUserEmail(): string {
  if (typeof window === 'undefined') {
    throw new Error('Cannot access sessionStorage on server');
  }

  const userEmail = sessionStorage.getItem('userEmail');
  
  if (!userEmail) {
    throw new Error('User email not found. Please log in again.');
  }

  return userEmail;
}

/**
 * Get presigned URL for file upload
 */
export async function getPresignedUrl(
  filename: string,
  conversationId?: string
): Promise<PresignedUrlResponse> {
  try {
    const userEmail = getUserEmail();
    const headers = getAuthHeaders();

    const requestBody: PresignedUrlRequest = {
      filename,
      user_id: userEmail,
    };

    // Only include conversation_id if it exists
    if (conversationId) {
      requestBody.conversation_id = conversationId;
    }

    const response = await fetch(`${API_BASE_URL}/get-presigned-url`, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        if (typeof window !== 'undefined') {
          sessionStorage.clear();
          window.location.href = '/login';
        }
        throw new Error('Authentication failed. Please log in again.');
      }

      const errorText = await response.text().catch(() => '');
      throw new Error(`Failed to get presigned URL: ${response.status} ${errorText}`);
    }

    const data: PresignedUrlResponse = await response.json();
    return data;
  } catch (error) {
    console.error('Error getting presigned URL:', error);
    throw error;
  }
}

/**
 * Upload file to S3 using presigned URL
 */
export async function uploadFileToS3(
  presignedUrl: string,
  file: File
): Promise<void> {
  try {
    const response = await fetch(presignedUrl, {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': file.type || 'application/octet-stream',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to upload file to S3: ${response.status}`);
    }
  } catch (error) {
    console.error('Error uploading file to S3:', error);
    throw error;
  }
}

/**
 * Process and upload a single file
 */
export async function processFileUpload(
  file: File,
  conversationId?: string
): Promise<FileAttachment> {
  try {
    console.log(`Processing file: ${file.name} (${file.type})`);

    // Get presigned URL
    const presignedData = await getPresignedUrl(file.name, conversationId);
    
    // Upload file to S3
    await uploadFileToS3(presignedData.url, file);

    // Create preview URL for images
    let previewUrl: string | undefined;
    if (file.type.startsWith('image/')) {
      previewUrl = URL.createObjectURL(file);
    }

    return {
      file,
      uploadPath: presignedData.upload_path,
      filename: presignedData.filename,
      conversationId: presignedData.conversation_id,
      previewUrl,
      type: file.type,
    };
  } catch (error) {
    console.error(`Error processing file ${file.name}:`, error);
    throw error;
  }
}

/**
 * Process and upload multiple files
 */
export async function processMultipleFileUploads(
  files: File[],
  conversationId?: string
): Promise<FileAttachment[]> {
  console.log(`Processing ${files.length} files...`);
  
  const uploadPromises = files.map(file => 
    processFileUpload(file, conversationId)
  );

  try {
    const results = await Promise.all(uploadPromises);
    console.log(`Successfully uploaded ${results.length} files`);
    return results;
  } catch (error) {
    console.error('Error uploading multiple files:', error);
    throw error;
  }
}

/**
 * Get file icon based on file type
 */
export function getFileIcon(fileType: string): string {
  if (fileType.startsWith('image/')) return '🖼️';
  if (fileType.includes('pdf')) return '📄';
  if (fileType.includes('text')) return '📝';
  if (fileType.includes('spreadsheet') || fileType.includes('excel')) return '📊';
  if (fileType.includes('presentation') || fileType.includes('powerpoint')) return '📊';
  if (fileType.includes('word') || fileType.includes('document')) return '📝';
  if (fileType.includes('csv')) return '📊';
  return '📎';
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Validate file before upload
 */
export function validateFile(file: File): { valid: boolean; error?: string } {
  // Check file size (max 10MB)
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size exceeds 10MB limit (${formatFileSize(file.size)})`,
    };
  }

  // Check file type (allow common types)
  const ALLOWED_TYPES = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'text/plain',
    'text/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];

  const isAllowedType = ALLOWED_TYPES.some(type => 
    file.type === type || file.type.startsWith(type.split('/')[0])
  );

  if (!isAllowedType) {
    return {
      valid: false,
      error: `File type not supported: ${file.type}`,
    };
  }

  return { valid: true };
}