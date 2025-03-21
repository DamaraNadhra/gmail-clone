export interface DraftEmail {
  subject: string;
  to: string;
  cc: string;
  bcc: string;
  content: string;
  attachments?: File[];
}