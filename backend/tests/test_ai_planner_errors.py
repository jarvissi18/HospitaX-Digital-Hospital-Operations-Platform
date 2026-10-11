
from unittest.mock import patch

import pytest
from google.genai.errors import ServerError

from app.ai.gemini_operations import plan_ai_operation


def test_gemini_503_returns_friendly_error_without_execution():
    server_error = ServerError(
        503,
        {"error": {
            "code": 503,
            "message": "Service temporarily unavailable",
            "status": "UNAVAILABLE",
        }},
    )

    with (
        patch(
            "app.ai.gemini_operations._get_authorized_tools",
            return_value=[{"name": "test_tool"}],
        ),
        patch(
            "app.ai.gemini_operations.generate_content",
            side_effect=server_error,
        ) as mock_generate,
        patch(
            "app.ai.gemini_operations.get_tool",
        ) as mock_get_tool,
    ):
        with pytest.raises(
            RuntimeError,
            match="AI service is temporarily unavailable",
        ):
            plan_ai_operation(
                message="Please summarize the current hospital operations.",
                current_user=object(),
            )

    mock_generate.assert_called_once()
    mock_get_tool.assert_not_called()
