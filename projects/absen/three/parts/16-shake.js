function shake(t, amp, freq = 18) { return V((noise1(t * freq) - .5) * amp, (noise1(t * freq + 40) - .5) * amp, 0); }
