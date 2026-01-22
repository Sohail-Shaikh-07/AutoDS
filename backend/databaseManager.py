from sqlalchemy import create_engine, text, inspect
from typing import Dict, List, Any
import pandas as pd


class DatabaseManager:
    def __init__(self):
        self.engine = None
        self.active_connection_str = None

    def connect(self, connection_details: Dict[str, str]) -> Dict[str, Any]:
        """
        Establishes a database connection.
        Expected keys: type, host, port, user, password, database
        """
        try:
            db_type = connection_details.get("type", "postgresql")
            user = connection_details.get("user")
            password = connection_details.get("password")
            host = connection_details.get("host")
            port = connection_details.get("port")
            database = connection_details.get("database")

            # Construct Connection URI
            if db_type == "postgresql":
                uri = f"postgresql://{user}:{password}@{host}:{port}/{database}"
            elif db_type == "mysql":
                uri = f"mysql+pymysql://{user}:{password}@{host}:{port}/{database}"
            elif db_type == "sqlite":
                # For sqlite, 'host' is treated as filepath or :memory:
                uri = f"sqlite:///{host}"
            else:
                return {"error": f"Unsupported database type: {db_type}"}

            # Create Engine
            self.engine = create_engine(uri)

            # Test Connection
            with self.engine.connect() as conn:
                conn.execute(text("SELECT 1"))

            self.active_connection_str = f"{db_type}://{host}/{database}"
            return {"status": "success", "message": f"Connected to {database}"}

        except Exception as e:
            self.engine = None
            return {"error": str(e)}

    def get_schema(self) -> Dict[str, List[str]]:
        """
        Returns a dictionary of table names and their columns.
        """
        if not self.engine:
            return {"error": "No active database connection"}

        try:
            inspector = inspect(self.engine)
            schema_info = {}
            for table_name in inspector.get_table_names():
                columns = [col["name"] for col in inspector.get_columns(table_name)]
                schema_info[table_name] = columns
            return schema_info
        except Exception as e:
            return {"error": str(e)}

    def execute_query(self, query: str) -> Dict[str, Any]:
        """
        Executes a SELECT query and returns the result as a DataFrame (dict format).
        """
        if not self.engine:
            return {"error": "No active database connection"}

        # Basic safety: Prevent DROP/DELETE/INSERT/UPDATE for Safety MVP
        forbidden = ["DROP", "DELETE", "INSERT", "UPDATE", "ALTER", "TRUNCATE"]
        if any(word in query.upper() for word in forbidden):
            return {"error": "Safety Restriction: Only SELECT queries are allowed."}

        try:
            # Use pandas for easy reading
            df = pd.read_sql(query, self.engine)

            # Sanitize for JSON
            df = df.where(pd.notnull(df), None)

            return {
                "columns": list(df.columns),
                "data": df.head(1000).to_dict(orient="records"), 
                "row_count": len(df),
                "truncated": len(df) > 1000,
            }
        except Exception as e:
            return {"error": str(e)}
