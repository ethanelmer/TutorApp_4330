import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Quiz from '../Quiz';
import axios from 'axios';

jest.mock('axios', () => ({
    get: jest.fn(),
    post: jest.fn(),
}));

jest.mock('react-markdown', () => ({
    __esModule: true,
    default: ({ children }) => <>{children}</>,
}));

describe('Quiz component', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('displays quiz questions and toggles answers', async () => {
        const quizPayload = '{"questions":[{"question":"What is AI?","answer":"Artificial intelligence."}]}';
        axios.get.mockResolvedValueOnce({ data: { quiz: quizPayload } });

        render(<Quiz onBackToChat={() => { }} />);

        expect(await screen.findByText(/Question 1/i)).toBeInTheDocument();
        expect(screen.getByText(/What is AI\?/i)).toBeInTheDocument();

        const toggleButton = screen.getByRole('button', { name: /Show Answer/i });
        fireEvent.click(toggleButton);

        expect(await screen.findByText(/Artificial intelligence\./i)).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: /Hide Answer/i }));
        await waitFor(() => expect(screen.queryByText(/Artificial intelligence\./i)).not.toBeInTheDocument());
    });

    test('renders error state and retries generation', async () => {
        axios.get.mockRejectedValueOnce(new Error('preload failed'));
        axios.post
            .mockRejectedValueOnce(new Error('Unable to fetch quiz'))
            .mockResolvedValueOnce({
                data: {
                    quiz: '{"questions":[{"question":"Recovered question?","answer":"Recovered answer."}]}'
                }
            });

        render(<Quiz onBackToChat={() => { }} />);

        expect(await screen.findByText(/Unable to fetch quiz/i)).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: /Try Again/i }));

        await waitFor(() => expect(axios.post).toHaveBeenCalledTimes(2));
        expect(await screen.findByText(/Recovered question/i)).toBeInTheDocument();
    });
});
