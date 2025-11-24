import pytest
from unittest.mock import Mock, patch
import sys
import os
from pathlib import Path


os.environ['HF_TOKEN'] = 'token-for-testing'

sys.path.insert(0, str(Path(__file__).parent))


class TestGetAIResponse:
    
    @patch('model_service.get_model_response')
    def test_basic_call(self, mock_get_response):
        mock_get_response.return_value = "LeBron is one of the greatest players"
        
        from model_service import get_ai_response
        
        result = get_ai_response("Who is LeBron?", ["LeBron plays basketball"])
        
        assert result == "LeBron is one of the greatest players"

    @patch('model_service.get_model_response')
    def test_with_history(self, mock_get_response):
        mock_get_response.return_value = "He won 4 championships"
        
        from model_service import get_ai_response
        
        history = "User: Who is LeBron?\nAssistant: A basketball player"
        result = get_ai_response("How many rings?", ["LeBron has 4 rings"], conversation_history=history)
        
        assert result == "He won 4 championships"

    @patch('model_service.get_model_response')
    def test_rate_limit(self, mock_get_response):
        mock_get_response.side_effect = Exception("rate_limit exceeded")
        
        from model_service import get_ai_response
        
        result = get_ai_response("test", ["test"])
        
        assert "high demand" in result

    @patch('model_service.get_model_response')
    def test_429_error(self, mock_get_response):
        mock_get_response.side_effect = Exception("Error 429")
        
        from model_service import get_ai_response
        
        result = get_ai_response("test", ["test"])
        
        assert "high demand" in result

    @patch('model_service.get_model_response')
    @patch.dict('os.environ', {'DEBUG': 'false'})
    def test_error_without_debug(self, mock_get_response):
        mock_get_response.side_effect = ValueError("Something broke")
        
        from model_service import get_ai_response
        
        result = get_ai_response("test", ["test"])
        
        assert "encountered an error" in result

    @patch('model_service.get_model_response')
    @patch.dict('os.environ', {'DEBUG': 'true'})
    def test_error_with_debug(self, mock_get_response):
        mock_get_response.side_effect = ValueError("Debug error")
        
        from model_service import get_ai_response
        
        result = get_ai_response("test", ["test"])
        
        assert "Debug error" in result
        assert "Traceback" in result