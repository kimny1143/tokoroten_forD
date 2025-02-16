import os
import re
import pandas as pd
import logging
from markdown import Markdown
from io import StringIO

# ロギングの設定
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class MarkdownToCSVConverter:
    def __init__(self):
        """Markdown→CSV変換クラスの初期化"""
        self.md = Markdown(extensions=['tables'])
        
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
            
    def convert_markdown_to_csv(self, markdown_path, output_dir=None):
        """
        Markdownファイルからテーブルを抽出してCSVファイルに変換
        
        Args:
            markdown_path (str): 入力Markdownファイルのパス
            output_dir (str, optional): 出力CSVファイルのディレクトリ
            
        Returns:
            list: 生成されたCSVファイルのパスのリスト
        """
        try:
            # Markdownファイルを読み込み
            with open(markdown_path, 'r', encoding='utf-8') as f:
                markdown_text = f.read()
                
            # テーブルを抽出
            dataframes = self._extract_tables_from_markdown(markdown_text)
            
            if not dataframes:
                logger.warning("テーブルが見つかりませんでした")
                return []
                
            # 出力ディレクトリの設定
            if output_dir is None:
                output_dir = os.path.dirname(markdown_path)
            os.makedirs(output_dir, exist_ok=True)
            
            # ベースファイル名を取得
            base_name = os.path.splitext(os.path.basename(markdown_path))[0]
            
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