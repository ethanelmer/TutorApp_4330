import pytest
from unittest.mock import Mock, patch
import sys
import os
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))


class TestChromaConnection:
    
    def setup_method(self):
        from chromaConnection import _reset_client_for_tests
        _reset_client_for_tests()
    
    @patch('chromaConnection.chromadb.CloudClient')
    @patch.dict('os.environ', {'CHROMA_API_KEY': 'test-key'})
    def test_client_creation(self, mock_cloud_client):
        mock_cloud_client.return_value = Mock()
        
        from chromaConnection import get_chroma_client
        
        client = get_chroma_client()
        
        assert client is not None
    
    @patch('chromaConnection.chromadb.CloudClient')
    @patch.dict('os.environ', {'CHROMA_API_KEY': 'test-key'})
    def test_client_reused(self, mock_cloud_client):
        mock_cloud_client.return_value = Mock()
        
        from chromaConnection import get_chroma_client
        
        client1 = get_chroma_client()
        client2 = get_chroma_client()
        
        assert client1 is client2
    
    @patch.dict('os.environ', {}, clear=True)
    def test_no_api_key(self):
        from chromaConnection import get_chroma_client
        
        with pytest.raises(RuntimeError):
            get_chroma_client()
    
    @patch('chromaConnection.chromadb.CloudClient')
    @patch.dict('os.environ', {'CHROMA_API_KEY': 'test-key'})
    def test_connection_error(self, mock_cloud_client):
        mock_cloud_client.side_effect = Exception("Connection failed")
        
        from chromaConnection import get_chroma_client
        
        with pytest.raises(RuntimeError):
            get_chroma_client()