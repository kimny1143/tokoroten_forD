import os
from markdown_csv import MarkdownToCSVConverter

def test_markdown_to_csv():
    # テスト用のファイルパスを設定
    current_dir = os.path.dirname(os.path.abspath(__file__))
    test_file = os.path.join(current_dir, '..', 'test_files', 'md', 'song-list.md')
    output_dir = os.path.join(current_dir, '..', 'test_files', 'output')
    
    # コンバーターを初期化
    converter = MarkdownToCSVConverter()
    
    try:
        # 変換を実行
        csv_paths = converter.convert_markdown_to_csv(test_file, output_dir)
        
        if csv_paths:
            print("変換成功！")
            print("生成されたCSVファイル:")
            for path in csv_paths:
                print(f"- {path}")
                
            # 生成されたCSVファイルの内容を確認
            import pandas as pd
            for path in csv_paths:
                print(f"\n{os.path.basename(path)}の内容:")
                df = pd.read_csv(path, encoding='utf-8-sig')
                print(df.head())
                print(f"列名: {list(df.columns)}")
                print(f"行数: {len(df)}")
        else:
            print("テーブルが見つかりませんでした。")
            
    except Exception as e:
        print(f"エラーが発生しました: {str(e)}")

if __name__ == "__main__":
    test_markdown_to_csv() 