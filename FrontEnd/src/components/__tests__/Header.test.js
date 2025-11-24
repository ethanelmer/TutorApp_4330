import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Header from '../Header';

describe('Header component', () => {
    test('renders title and hides menu by default', () => {
        render(<Header onMenuClick={() => { }} showMenu={false} onMenuOptionClick={() => { }} />);

        expect(screen.getByText('Tutor App')).toBeInTheDocument();
        expect(screen.queryByText('New Chat')).not.toBeInTheDocument();
    });

    test('calls onMenuClick when the menu button is pressed', () => {
        const onMenuClick = jest.fn();
        render(<Header onMenuClick={onMenuClick} showMenu={false} onMenuOptionClick={() => { }} />);

        fireEvent.click(screen.getByRole('button', { name: /open menu/i }));
        expect(onMenuClick).toHaveBeenCalledTimes(1);
    });

    test('passes menu selection to handler', () => {
        const onOption = jest.fn();
        render(<Header onMenuClick={() => { }} showMenu={true} onMenuOptionClick={onOption} />);

        fireEvent.click(screen.getByText('Quiz Mode'));
        expect(onOption).toHaveBeenCalledWith('Quiz Mode');
    });
});
