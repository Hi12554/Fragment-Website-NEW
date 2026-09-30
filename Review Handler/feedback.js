let feedbackReturnFocus = null;

function openFeedbackModal(event) {
    if (event) event.preventDefault();
    const modal = document.getElementById('feedback-modal');
    feedbackReturnFocus = document.activeElement;
    document.getElementById('feedback-form').reset();
    document.getElementById('feedback-status').textContent = '';
    updateFeedbackStars();
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => {
        modal.classList.add('open');
        modal.querySelector('input[name="rating"]').focus();
    });
}

function closeFeedbackModal() {
    const modal = document.getElementById('feedback-modal');
    if (modal.hidden) return;
    modal.classList.remove('open');
    document.body.style.overflow = '';
    window.setTimeout(() => {
        if (!modal.classList.contains('open')) modal.hidden = true;
    }, 200);
    if (feedbackReturnFocus instanceof HTMLElement) feedbackReturnFocus.focus();
}

function handleFeedbackBackdrop(event) {
    if (event.target.id === 'feedback-modal') closeFeedbackModal();
}

function updateFeedbackStars() {
    const selectedRating = Number(document.querySelector('#feedback-form input[name="rating"]:checked')?.value || 0);
    document.querySelectorAll('.feedback-star').forEach(star => {
        const rating = Number(star.querySelector('input').value);
        star.classList.toggle('selected', rating <= selectedRating);
    });
}

async function submitWebsiteFeedback(event) {
    event.preventDefault();
    const form = document.getElementById('feedback-form');
    const status = document.getElementById('feedback-status');
    const submitButton = document.getElementById('feedback-submit');
    const rating = Number(form.querySelector('input[name="rating"]:checked')?.value || 0);

    if (rating < 1 || rating > 5) {
        status.textContent = 'Choose a star rating before sending.';
        return;
    }

    submitButton.disabled = true;
    status.textContent = 'Sending feedback...';

    try {
        const response = await fetch('/api/feedback', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                rating,
                message: form.elements.message.value.trim(),
                website: form.elements.website.value
            })
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || 'Feedback could not be sent.');

        form.reset();
        updateFeedbackStars();
        status.textContent = 'Thanks for your feedback!';
    } catch (error) {
        status.textContent = error.message || 'Feedback could not be sent. Please try again.';
    } finally {
        submitButton.disabled = false;
    }
}

document.addEventListener('keydown', event => {
    const modal = document.getElementById('feedback-modal');
    if (modal.hidden) return;
    if (event.key === 'Escape') {
        closeFeedbackModal();
        return;
    }
    if (event.key !== 'Tab') return;

    const focusable = [...modal.querySelectorAll('button:not([disabled]), input:not([disabled]):not(#feedback-website), textarea:not([disabled])')];
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
    }
});