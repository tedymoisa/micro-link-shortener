export type Url = {
  id: number;
  short_code: string;
  long_url: string;
  created_at: Date | undefined;
  qr_code: string | null;
};
