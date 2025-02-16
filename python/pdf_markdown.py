import os
import time
import logging
import random
from typing import Optional
from anthropic import Anthropic
from PyPDF2 import PdfReader

# ロギングの設定
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class PDFToMarkdownConverter:
    def __init__(self, api_key: Optional[str] = None, timeout: int = 30, max_retries: int = 3):
        """
        PDFToMarkdownConverterクラスのコンストラクタ
        
        Args:
            api_key (Optional[str]): Anthropic APIキー。Noneの場合は環境変数から取得
            timeout (int): APIリクエストのタイムアウト時間（秒）
            max_retries (int): 最大リトライ回数
        """
        self.api_key = api_key or os.getenv("ANTHROPIC_API_KEY")
        if not self.api_key:
            raise ValueError("API key must be provided either directly or through ANTHROPIC_API_KEY environment variable")
        
        self.anthropic = Anthropic(api_key=self.api_key)
        self.timeout = timeout
        self.max_retries = max_retries
        logger.info(f"Initialized Anthropic client with API key: {'*' * len(self.api_key)}")

    def extract_text_from_pdf(self, pdf_path: str) -> str:
        """
        PDFファイルからテキストを抽出する
        
        Args:
            pdf_path (str): PDFファイルのパス
            
        Returns:
            str: 抽出されたテキスト
        """
        try:
            reader = PdfReader(pdf_path)
            total_pages = len(reader.pages)
            logger.info(f"Reading PDF file: {pdf_path} with {total_pages} pages")
            
            text = ""
            for i, page in enumerate(reader.pages, 1):
                logger.info(f"Processing page {i}/{total_pages}")
                text += page.extract_text() + "\n"
            
            logger.info("Text extraction from PDF completed")
            return text
            
        except Exception as e:
            logger.error(f"Error extracting text from PDF: {str(e)}")
            raise

    def _exponential_backoff(self, retry_count: int) -> float:
        """
        指数バックオフ時間を計算する
        
        Args:
            retry_count (int): リトライ回数
            
        Returns:
            float: 待機時間（秒）
        """
        base_delay = 2
        max_delay = 30
        delay = min(base_delay * (2 ** retry_count) + random.uniform(0, 1), max_delay)
        return delay

    def convert_text_to_markdown(self, text: str) -> str:
        """
        テキストをMarkdown形式に変換する
        
        Args:
            text (str): 変換するテキスト
            
        Returns:
            str: Markdown形式のテキスト
        """
        retry_count = 0
        last_error = None
        
        while retry_count < self.max_retries:
            try:
                logger.info(f"Starting conversion to Markdown (attempt {retry_count + 1}/{self.max_retries})")
                logger.info(f"Input text length: {len(text)} characters")
                
                start_time = time.time()
                message = self.anthropic.messages.create(
                    model="claude-3-5-sonnet-20241022",
                    max_tokens=8000,
                    messages=[{
                        "role": "user",
                        "content": f"""以下のテキストを表形式のMarkdownに変換してください。
以下の形式に従ってください：

1. 最初に「# DK/PCM Recording Sheet(DAM) - [会社名]」という形式のタイトル
2. その後に「## [配信時期など]」のサブタイトル
3. その後に表形式で全ての楽曲情報を記載。列は以下を含む：
   | No. | 発注日 | 発売日 | デジタル発売日 | Rec会社 | 楽曲名 | 歌手名 | OrgTime | DK№ | 音素材 | 備考 |

重要：
- 必ず全ての楽曲を表示してください
- 曲数制限は不要です
- 「紙面の都合」などの理由で曲を省略しないでください
- 全ての楽曲を漏れなく表示することが最も重要です

注意点：
- 日付が無い場合は必ず「-」を使用（空白は不可）
- 楽曲名と歌手名は原文通りに分割
- 備考欄の情報は以下の形式で記載：
  - Vo.性別（複数の場合はその旨を記載）
  - コーラス情報（Cho）
  - 採点関連情報（F採不可など）
  - その他の重要な情報（セリフ、Rap、詞Rなど）
- 特記事項は以下の情報のみを記載：
  - 収録期間
  - 音源フォーマット
  - 採点機能の有無

テキスト:
{text}"""
                    }]
                )
                end_time = time.time()
                
                if end_time - start_time > self.timeout:
                    raise TimeoutError(f"Markdown conversion exceeded timeout of {self.timeout} seconds")
                
                markdown_text = message.content[0].text
                logger.info(f"Markdown conversion completed. Output length: {len(markdown_text)} characters")
                return markdown_text
                
            except Exception as e:
                last_error = e
                retry_count += 1
                
                if retry_count < self.max_retries:
                    delay = self._exponential_backoff(retry_count)
                    logger.warning(f"Error occurred: {str(e)}. Retrying in {delay:.2f} seconds...")
                    time.sleep(delay)
                else:
                    logger.error(f"Max retries ({self.max_retries}) reached. Last error: {str(e)}")
                    raise last_error
            
        raise last_error

    def save_markdown(self, markdown_text: str, output_path: str) -> None:
        """
        Markdownテキストをファイルに保存する
        
        Args:
            markdown_text (str): 保存するMarkdownテキスト
            output_path (str): 出力ファイルのパス
        """
        try:
            os.makedirs(os.path.dirname(output_path), exist_ok=True)
            logger.info(f"Saving Markdown to: {output_path}")
            
            with open(output_path, "w", encoding="utf-8") as f:
                f.write(markdown_text)
            
            logger.info("Markdown file saved successfully")
            
        except Exception as e:
            logger.error(f"Error saving Markdown file: {str(e)}")
            raise

    def convert_pdf_to_markdown(self, pdf_path: str, output_path: str) -> None:
        """
        PDFファイルをMarkdownに変換する
        
        Args:
            pdf_path (str): 入力PDFファイルのパス
            output_path (str): 出力Markdownファイルのパス
        """
        text = self.extract_text_from_pdf(pdf_path)
        markdown_text = self.convert_text_to_markdown(text)
        self.save_markdown(markdown_text, output_path) 