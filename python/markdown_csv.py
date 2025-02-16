import os
import re
import pandas as pd
import logging
from markdown import Markdown
from io import StringIO
import csv
from datetime import datetime
from typing import List

# ロギングの設定
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class MarkdownToCSVConverter:
    def __init__(self, output_dir=None):
        """
        Markdown→CSV変換クラスの初期化
        
        Args:
            output_dir (str, optional): 出力ディレクトリのパス
        """
        self.md = Markdown(extensions=['tables'])
        self.output_dir = output_dir
        
    def _parse_table_row(self, row):
        """
        テーブル行を解析
        
        Args:
            row (str): テーブル行の文字列
            
        Returns:
            list: セルの値のリスト
        """
        cells = row.split('|')[1:-1]
        return [cell.strip() for cell in cells]
        
    def _extract_tables_from_markdown(self, markdown_text):
        """
        Markdownテキストからテーブルを抽出
        
        Args:
            markdown_text (str): Markdownテキスト
            
        Returns:
            list: 抽出されたテーブルのリスト（DataFrameオブジェクト）
        """
        try:
            # テーブルを検出するための正規表現パターン
            table_pattern = r'\|[^\n]+\|\n\|[-: |]+\|\n(\|[^\n]+\|\n)+'
            
            # テーブルを検出
            tables_text = re.finditer(table_pattern, markdown_text)
            dataframes = []
            
            for table_text in tables_text:
                lines = [line.strip() for line in table_text.group().split('\n') if line.strip()]
                
                # ヘッダー行を取得
                header = self._parse_table_row(lines[0])
                
                # データ行を解析（ヘッダー行とセパレーター行をスキップ）
                data = [self._parse_table_row(line) for line in lines[2:] if '|' in line and not line.startswith('|--')]
                
                # ヘッダーとデータの列数が一致しない場合の処理
                if data:
                    max_columns = max(len(header), max(len(row) for row in data))
                    header = header + ['Column'+str(i+1) for i in range(len(header), max_columns)]
                    data = [row + [''] * (max_columns - len(row)) for row in data]
                
                df = pd.DataFrame(data, columns=header)
                
                # 必要な列のみを抽出し、新しい順序で並べ替え
                columns_map = {
                    'No.': '№',
                    '楽曲名': '曲名',
                    '歌手名': '歌手名',
                    'DK№': 'DK№',
                    'OrgTime': 'OrgTime',
                    '備考': 'RecSheet備考'
                }
                
                # 元の列名から新しい列名へのマッピングを作成
                columns_to_keep = []
                rename_dict = {}
                
                # 列名の存在確認とマッピング
                for orig_col, new_col in columns_map.items():
                    # 完全一致で検索
                    if orig_col in df.columns:
                        columns_to_keep.append(orig_col)
                        rename_dict[orig_col] = new_col
                    # 部分一致で検索（備考列の場合）
                    elif orig_col == '備考':
                        matching_cols = [col for col in df.columns if '備考' in col]
                        if matching_cols:
                            columns_to_keep.append(matching_cols[0])
                            rename_dict[matching_cols[0]] = new_col
                
                # 存在する列のみを抽出し、指定した順序で並べ替え
                df_reshaped = df[columns_to_keep].copy()
                
                # 列名を変更
                df_reshaped = df_reshaped.rename(columns=rename_dict)
                
                # データの整形
                for col in df_reshaped.columns:
                    if df_reshaped[col].dtype == 'object':
                        df_reshaped[col] = df_reshaped[col].str.strip()
                
                dataframes.append(df_reshaped)
                
            return dataframes
            
        except Exception as e:
            logger.error(f"テーブル抽出中にエラーが発生: {str(e)}")
            raise
            
    def convert_markdown_to_csv(self, markdown_text: str) -> List[str]:
        """
        Markdown形式のテキストをCSVファイルに変換する
        
        Args:
            markdown_text (str): 変換するMarkdownテキスト
            
        Returns:
            List[str]: 生成されたCSVファイルのパスのリスト
        """
        try:
            if self.output_dir is None:
                raise ValueError("出力ディレクトリが設定されていません")
                
            logger.info("Starting Markdown to CSV conversion")
            logger.info(f"Input markdown length: {len(markdown_text)} characters")
            
            # 必要な列のマッピングを定義
            columns_map = {
                'No.': '№',
                '楽曲名': '曲名',
                '歌手名': '歌手名',
                'DK№': 'DK№',
                'OrgTime': 'OrgTime',
                '備考': 'RecSheet備考'
            }
            
            # テーブルの行を抽出
            table_rows = []
            headers = None
            in_table = False
            header_indices = {}  # 必要な列のインデックスを保存
            
            for line in markdown_text.split('\n'):
                line = line.strip()
                if '|' in line:
                    cells = [cell.strip() for cell in line.split('|')[1:-1]]
                    if not in_table and '---' not in line:  # ヘッダー行
                        headers = cells
                        # 必要な列のインデックスを記録
                        for orig_col, new_col in columns_map.items():
                            try:
                                idx = headers.index(orig_col)
                                header_indices[new_col] = idx
                            except ValueError:
                                # 備考列の特別処理
                                if orig_col == '備考':
                                    matching_cols = [i for i, h in enumerate(headers) if '備考' in h]
                                    if matching_cols:
                                        header_indices[new_col] = matching_cols[0]
                        in_table = True
                    elif '---' not in line and in_table:  # データ行
                        # 必要な列のみを抽出して新しい順序で並べ替え
                        row_data = {}
                        for new_col, idx in header_indices.items():
                            if idx < len(cells):
                                row_data[new_col] = cells[idx]
                            else:
                                row_data[new_col] = ''
                        
                        # 新しい順序で行を追加
                        ordered_row = [row_data[col] for col in columns_map.values()]
                        table_rows.append(ordered_row)
            
            if not table_rows:
                raise ValueError("テーブルデータが見つかりませんでした")
            
            logger.info(f"Found {len(table_rows)} rows of data")
            
            # CSVファイルを生成
            output_files = []
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            output_path = os.path.join(self.output_dir, f'recording_sheet_{timestamp}.csv')
            
            with open(output_path, 'w', encoding='utf-8-sig', newline='') as f:
                writer = csv.writer(f)
                # 新しい列名で書き出し
                writer.writerow(columns_map.values())
                writer.writerows(table_rows)
            
            output_files.append(output_path)
            logger.info(f"Created CSV file: {output_path}")
            
            return output_files
            
        except Exception as e:
            logger.error(f"Error in convert_markdown_to_csv: {str(e)}")
            raise
            
    def convert_markdown_text_to_csv(self, markdown_text, output_dir, base_name):
        """
        Markdownテキストから直接テーブルを抽出してCSVファイルに変換
        
        Args:
            markdown_text (str): Markdownテキスト
            output_dir (str): 出力CSVファイルのディレクトリ
            base_name (str): 出力ファイルのベース名
            
        Returns:
            list: 生成されたCSVファイルのパスのリスト
        """
        try:
            # テーブルを抽出
            dataframes = self._extract_tables_from_markdown(markdown_text)
            
            if not dataframes:
                logger.warning("テーブルが見つかりませんでした")
                return []
                
            # 出力ディレクトリの作成
            os.makedirs(output_dir, exist_ok=True)
            
            # 各テーブルをCSVとして保存
            csv_paths = []
            for i, df in enumerate(dataframes):
                # UTF-8 with BOMで保存
                csv_path = os.path.join(output_dir, f"{base_name}_table_{i+1}.csv")
                df.to_csv(csv_path, index=False, encoding='utf-8-sig')
                csv_paths.append(csv_path)
                logger.info(f"CSVファイルを保存しました: {csv_path}")
                
            return csv_paths
            
        except Exception as e:
            logger.error(f"Markdown→CSV変換中にエラーが発生: {str(e)}")
            raise

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) != 3:
        print("Usage: python markdown_csv.py <markdown_path> <output_path>")
        sys.exit(1)
    
    try:
        markdown_path = sys.argv[1]
        output_path = sys.argv[2]
        
        # 出力ディレクトリとベース名を取得
        output_dir = os.path.dirname(output_path)
        base_name = os.path.splitext(os.path.basename(output_path))[0]
        
        converter = MarkdownToCSVConverter(output_dir)
        
        # Markdownファイルを読み込み
        with open(markdown_path, 'r', encoding='utf-8') as f:
            markdown_text = f.read()
        
        # テーブルを抽出してDataFrameに変換
        dataframes = converter._extract_tables_from_markdown(markdown_text)
        
        if not dataframes:
            print("テーブルが見つかりませんでした")
            sys.exit(1)
        
        # 最初のテーブルをCSVとして保存
        df = dataframes[0]
        os.makedirs(output_dir, exist_ok=True)
        df.to_csv(output_path, index=False, encoding='utf-8-sig')
        print(f"CSVファイルを保存しました: {output_path}")
        sys.exit(0)
        
    except Exception as e:
        print(f"Error: {str(e)}")
        sys.exit(1) 