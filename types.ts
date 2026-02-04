
export interface Channel {
  id: string;
  name: string;
  group: string;
  logo: string;
  url: string;
  source: string;
}

export interface PlaylistSource {
  name: string;
  url: string;
  type: string;
}

export interface AIResponse {
  summary: string;
  recommendations: string[];
  categoryAnalysis: string;
}
