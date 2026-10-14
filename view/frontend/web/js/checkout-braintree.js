/**
 * Copyright © 2026 Roman Pasichnyk
 * SPDX-License-Identifier: OSL-3.0 OR AFL-3.0
 *
 * Braintree Hosted Fields for Zero Checkout — plain JS, no RequireJS/Knockout.
 * Same braintree-web SDK calls as core's adapter.js / hosted-fields.js
 * (client.create → hostedFields.create → tokenize), driving our own <form>.
 *
 * Intercepts submit only while the checked payment_method is `braintree`; every
 * other method submits untouched. Tokenization errors show the SDK message;
 * gateway declines come back through Placeorder's normal error path.
 * Not implemented: 3D Secure, device-data collection, vaulted cards.
 */
(function () {
    'use strict';

    // Settings rendered by the template as JSON (no inline script: strict CSP).
    var settingsEl = document.getElementById('zero-braintree-config');
    var settings = settingsEl ? JSON.parse(settingsEl.textContent) : {};

    var form = document.getElementById('checkout-form');
    var cardFields = document.getElementById('braintree-card-fields');
    if (!form || !cardFields || !settings.clientToken || !window.braintree) {
        return;
    }

    var errorBox = document.getElementById('braintree-error');
    var nonceInput = document.getElementById('payment_method_nonce');
    var submitButton = form.querySelector('button[type="submit"]');
    var hostedFieldsInstance = null;
    var hostedFieldsReady = null;

    function showError(message) {
        errorBox.textContent = message;
        errorBox.classList.remove('hidden');
    }

    function clearError() {
        errorBox.textContent = '';
        errorBox.classList.add('hidden');
    }

    function isBraintreeChecked() {
        var checked = form.querySelector('input[name="payment_method"]:checked');
        return !!checked && checked.value === 'braintree';
    }

    /**
     * Creates the client + Hosted Fields the first time `braintree` is selected —
     * not at submit, because until then the three containers are empty divs that
     * look like inputs but accept no typing. The cached Promise prevents a second
     * hostedFields.create() on the same containers (the SDK rejects that).
     */
    function ensureHostedFields() {
        if (hostedFieldsReady) {
            return hostedFieldsReady;
        }

        hostedFieldsReady = new Promise(function (resolve, reject) {
            window.braintree.client.create(
                { authorization: settings.clientToken },
                function (clientErr, clientInstance) {
                    if (clientErr) {
                        reject(clientErr);
                        return;
                    }

                    window.braintree.hostedFields.create(
                        {
                            client: clientInstance,
                            styles: {
                                input: { 'font-size': '14px', color: '#1c1c1c' },
                                '::placeholder': { color: '#9a9a9a' }
                            },
                            fields: {
                                number: {
                                    selector: '#braintree-cc-number',
                                    placeholder: '4111 1111 1111 1111'
                                },
                                expirationDate: {
                                    selector: '#braintree-cc-expiration',
                                    placeholder: 'MM/YY'
                                },
                                cvv: {
                                    selector: '#braintree-cc-cvv',
                                    placeholder: '123'
                                }
                            }
                        },
                        function (hostedFieldsErr, instance) {
                            if (hostedFieldsErr) {
                                reject(hostedFieldsErr);
                                return;
                            }
                            hostedFieldsInstance = instance;
                            resolve(instance);
                        }
                    );
                }
            );
        });

        return hostedFieldsReady;
    }

    // Build Hosted Fields as soon as Credit Card is selected, or right away if
    // it's already checked on load.
    Array.prototype.forEach.call(
        form.querySelectorAll('input[name="payment_method"]'),
        function (radio) {
            radio.addEventListener('change', function () {
                if (isBraintreeChecked()) {
                    ensureHostedFields().catch(function (err) {
                        showError((err && err.message) || 'Credit card form failed to load.');
                    });
                }
            });
        }
    );
    if (isBraintreeChecked()) {
        ensureHostedFields().catch(function (err) {
            showError((err && err.message) || 'Credit card form failed to load.');
        });
    }

    form.addEventListener('submit', function (event) {
        if (!isBraintreeChecked()) {
            return;
        }

        // Second pass: requestSubmit() below re-enters this handler after tokenizing.
        if (nonceInput.value) {
            return;
        }

        event.preventDefault();
        clearError();
        if (submitButton) {
            submitButton.disabled = true;
        }

        ensureHostedFields()
            .then(function (instance) {
                return instance.tokenize();
            })
            .then(function (payload) {
                nonceInput.value = payload.nonce;
                form.requestSubmit();
            })
            .catch(function (err) {
                showError(
                    (err && err.message) ||
                    'We couldn’t process that card. Please check the details and try again.'
                );
                if (submitButton) {
                    submitButton.disabled = false;
                }
            });
    });
})();
