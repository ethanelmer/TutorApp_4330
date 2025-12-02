import pytest
from unittest.mock import Mock, patch
from openai import RateLimitError
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

with patch.dict('os.environ', {'HF_TOKEN': 'fake-token-for-testing'}):
    from modelCall import get_model_response

class TestGetModelResponse:
    
    @patch('modelCall.client')
    def test_basic_response(self, mock_client):
        # Set up fake response to test
        mock_completion = Mock()
        mock_completion.choices = [Mock(message=Mock(content="LeBron is considered one of the greatest"))]
        mock_client.chat.completions.create.return_value = mock_completion

        # Call the function to get the response from the model
        result = get_model_response("Is LeBron the GOAT?", ["LeBron has 4 championships"])

        # Check the results
        assert result == "LeBron is considered one of the greatest"
        mock_client.chat.completions.create.assert_called_once()

    @patch('modelCall.client')
    def test_with_conversation_history(self, mock_client):
        # Set up fake response to test
        mock_completion = Mock()
        mock_completion.choices = [Mock(message=Mock(content="Yeah his Lakers stats are impressive too"))]
        mock_client.chat.completions.create.return_value = mock_completion

        # Tests this time with conversation history
        history = "User: How many rings does LeBron have?\nAssistant: LeBron has 4 NBA championships."
        result = get_model_response("What about his time with the Lakers?", ["LeBron won a ring in 2020"], history)

        assert result == "Yeah his Lakers stats are impressive too"

    @patch('modelCall.client')
    @patch('modelCall.time.sleep')
    def test_rate_limit_retry(self, mock_sleep, mock_client):
        # Test retry logic works
        mock_completion = Mock()
        mock_completion.choices = [Mock(message=Mock(content="Success after retry"))]
        
        # First call fails, second succeeds
        mock_client.chat.completions.create.side_effect = [
            RateLimitError("Rate limit exceeded", response=Mock(), body={}),
            mock_completion
        ]

        result = get_model_response("Test prompt", ["Test chunk"], max_retries=3)

        # Should have retried and succeeded
        assert result == "Success after retry"
        assert mock_client.chat.completions.create.call_count == 2

    @patch('modelCall.client')
    @patch('modelCall.time.sleep')
    def test_rate_limit_max_retries(self, mock_sleep, mock_client):
        # Keep failing to test max retries
        mock_client.chat.completions.create.side_effect = RateLimitError(
            "Rate limit exceeded", 
            response=Mock(), 
            body={}
        )

        # Should raise error after max retries
        with pytest.raises(RateLimitError):
            get_model_response("Test prompt", ["Test chunk"], max_retries=3)
        
        assert mock_client.chat.completions.create.call_count == 3

    @patch('modelCall.client')
    def test_other_exceptions(self, mock_client):
        # Make sure others errors don't retry
        mock_client.chat.completions.create.side_effect = ValueError("Invalid input")

        with pytest.raises(ValueError):
            get_model_response("Test", ["Test"])
        
        # Should only try once
        assert mock_client.chat.completions.create.call_count == 1