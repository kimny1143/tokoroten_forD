import os
from pdf_markdown import PDFToMarkdownConverter
import logging
from dotenv import load_dotenv

def test_pdf_to_markdown():
    # .envファイルから環境変数を読み込む
    load_dotenv()
    
    # テスト用のファイルパスを設定
    current_dir = os.path.dirname(os.path.abspath(__file__))
    test_file = os.path.join(current_dir, '..', 'test_files', 'pdf', 'test_RecSheet.pdf')
    output_dir = os.path.join(current_dir, '..', 'test_files', 'output')
    output_file = os.path.join(output_dir, 'test_RecSheet.md')
    
    # 出力ディレクトリが存在しない場合は作成
    os.makedirs(output_dir, exist_ok=True)
    
    # APIキーを環境変数から取得
    api_key = os.getenv('ANTHROPIC_API_KEY')
    if not api_key:
        print("警告: ANTHROPIC_API_KEYが設定されていません。")
        return
    
    # コンバーターを初期化
    converter = PDFToMarkdownConverter(api_key=api_key)
    
    try:
        print(f"PDFファイルを処理中: {test_file}")
        
        # まずテキスト抽出のみをテスト
        extracted_text = converter.extract_text_from_pdf(test_file)
        print("\n=== 抽出されたテキスト（最初の500文字）===")
        print(extracted_text[:500])
        print("...")
        
        # Markdown変換を実行
        print("\nMarkdownに変換中...")
        converter.convert_pdf_to_markdown(test_file, output_file)
        
        # 生成されたファイルを読み込んで表示
        print("\n=== 生成されたMarkdown（最初の500文字）===")
        with open(output_file, 'r', encoding='utf-8') as f:
            markdown_text = f.read()
            print(markdown_text[:500])
            print("...")
        
        print(f"\nMarkdownファイルが保存されました: {output_file}")
        
    except Exception as e:
        print(f"エラーが発生しました: {str(e)}")

if __name__ == "__main__":
    test_pdf_to_markdown() 