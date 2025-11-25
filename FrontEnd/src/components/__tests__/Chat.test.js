import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Chat from '../Chat';
import axios from 'axios';

jest.mock('axios', () => ({
    get: jest.fn(),
    post: jest.fn(),
    delete: jest.fn(),
}));

jest.mock('react-markdown', () => ({
    __esModule: true,
    default: ({ children }) => <>{children}</>,
}));

const mockInitialNetwork = () => {
    axios.post.mockImplementation((url) => {
        if (url.endsWith('/api/chat/thread/new')) {
            return Promise.resolve({ data: { thread_id: 'thread-123' } });
        }
        if (url.includes('/api/chat/thread/') && url.endsWith('/message')) {
            return Promise.resolve({ data: { message: 'Here is a helpful answer.' } });
        }
        if (url.endsWith('/api/upload/')) {
            return Promise.resolve({ data: { chunks: 3 } });
        }
        return Promise.resolve({ data: {} });
    });

    axios.get.mockImplementation((url) => {
        if (url.endsWith('/api/documents/')) {
            return Promise.resolve({ data: { document_count: 2 } });
        }
        if (url.endsWith('/api/chat/threads')) {
            return Promise.resolve({ data: { threads: [] } });
        }
        if (url.includes('/api/chat/thread/') && url.endsWith('/history')) {
            return Promise.resolve({ data: { messages: [] } });
        }
        return Promise.resolve({ data: {} });
    });

    axios.delete.mockResolvedValue({ data: {} });
};

describe('Chat component', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockInitialNetwork();
    });

    test('renders greeting and document banner after initialization', async () => {
        render(<Chat />);

        expect(screen.getByText(/How can I assist you today\?/i)).toBeInTheDocument();

        await waitFor(() =>
            expect(screen.getByText(/document chunks available for reference/i)).toBeInTheDocument()
        );
    });

    test('sends a message and renders the bot reply', async () => {
        render(<Chat />);

        const input = await screen.findByPlaceholderText(/Ask me about your documents/i);
        fireEvent.change(input, { target: { value: 'Tell me something' } });
        fireEvent.click(screen.getByRole('button', { name: '➤' }));

        expect(screen.getByText('Tell me something')).toBeInTheDocument();
        await waitFor(() => expect(screen.getByText('Here is a helpful answer.')).toBeInTheDocument());
    });

    test('shows an error when the request fails', async () => {
        axios.post.mockImplementation((url) => {
            if (url.endsWith('/api/chat/thread/new')) {
                return Promise.resolve({ data: { thread_id: 'thread-123' } });
            }
            if (url.includes('/api/chat/thread/') && url.endsWith('/message')) {
                return Promise.reject(new Error('Network down'));
            }
            return Promise.resolve({ data: {} });
        });

        render(<Chat />);

        const input = await screen.findByPlaceholderText(/Ask me about your documents/i);
        fireEvent.change(input, { target: { value: 'Are you there?' } });
        fireEvent.click(screen.getByRole('button', { name: '➤' }));

        await waitFor(() => {
            const errorMessages = screen.getAllByText(/Sorry, something went wrong/i);
            expect(errorMessages.length).toBeGreaterThan(0);
        });
    });

    test('creates a new chat when the button is pressed', async () => {
        render(<Chat />);

        await waitFor(() => expect(
            axios.post.mock.calls.filter(([url]) => url?.includes('/api/chat/thread/new')).length
        ).toBeGreaterThan(0));

        const initialNewThreadCalls = axios.post.mock.calls.filter(([url]) => url?.includes('/api/chat/thread/new')).length;
        fireEvent.click(screen.getByText('+ New Chat'));

        await waitFor(() => expect(
            axios.post.mock.calls.filter(([url]) => url?.includes('/api/chat/thread/new')).length
        ).toBeGreaterThan(initialNewThreadCalls));
    });
});
