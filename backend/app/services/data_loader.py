import pandas as pd
import os
import io
from typing import Dict, Any

class DataLoader:
    @staticmethod
    def load_file(file_path: str) -> pd.DataFrame:
        """
        Loads a file into a Pandas DataFrame based on extension.
        """
        ext = os.path.splitext(file_path)[1].lower()
        if ext == '.csv':
            return pd.read_csv(file_path)
        elif ext in ['.xls', '.xlsx']:
            return pd.read_excel(file_path)
        elif ext == '.json':
            return pd.read_json(file_path)
        else:
            raise ValueError(f"Unsupported file format: {ext}")

    @staticmethod
    def generate_profile(df: pd.DataFrame) -> Dict[str, Any]:
        """
        Generates a lightweight metadata summary of the dataframe for the LLM.
        """
        buffer = io.StringIO()
        df.info(buf=buffer)
        info_str = buffer.getvalue()
        
        # Sanitize head for JSON: Replace NaN with None
        head_sanitized = df.head(3).replace({float('nan'): None}).to_dict(orient='records')
        
        return {
            "columns": list(df.columns),
            "dtypes": df.dtypes.astype(str).to_dict(),
            "missing_values": df.isnull().sum().to_dict(),
            "head": head_sanitized,
            "shape": df.shape,
            "info_str": info_str
        }