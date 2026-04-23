document.addEventListener('DOMContentLoaded', () => {
    // 1. Elements
    const loader = document.getElementById('loading-screen');
    const heroTitle = document.getElementById('hero-typewriter');
    const audio = document.getElementById('bgAudio');
    const audioToggle = document.getElementById('audioToggle');
    const audioIcon = document.getElementById('audioIcon');

    // Content
    const titleText = "Passmore Hunduza nee Mapa";
    const START_TIME = 3; 
    audio.currentTime = START_TIME;

    // Typewriter Function (Restored to only title)
    function typeWriter(element, text, i, speed, fnCallback) {
        if (element && i < text.length) {
            element.innerHTML = text.substring(0, i + 1) + '<span class="typewriter-cursor">|</span>';
            setTimeout(() => {
                typeWriter(element, text, i + 1, speed, fnCallback);
            }, speed);
        } else if (element) {
            const cursor = element.querySelector('.typewriter-cursor');
            if(cursor) cursor.style.display = 'none';
            if (typeof fnCallback == 'function') fnCallback();
        }
    }

    // Load & Sequence
    window.addEventListener('load', () => {
        setTimeout(() => {
            loader.classList.add('loader-hidden');
            
            // Only Title has the effect
            setTimeout(() => {
                typeWriter(heroTitle, titleText, 0, 100);
            }, 800);

            attemptPlay();
        }, 1500);
    });

    function attemptPlay() {
        if (audio.currentTime < START_TIME) audio.currentTime = START_TIME;
        audio.play().then(() => {
            if(audioIcon) audioIcon.innerText = '♪';
            if(audioToggle) audioToggle.classList.remove('muted');
        }).catch(error => {
            console.log("Autoplay blocked.");
            if(audioIcon) audioIcon.innerText = '✕';
            if(audioToggle) audioToggle.classList.add('muted');
        });
    }

    if (audioToggle) {
        audioToggle.addEventListener('click', () => {
            if (audio.paused) {
                if (audio.currentTime < START_TIME) audio.currentTime = START_TIME;
                audio.play();
                audioIcon.innerText = '♪';
                audioToggle.classList.remove('muted');
            } else {
                audio.pause();
                audioIcon.innerText = '✕';
                audioToggle.classList.add('muted');
            }
        });
    }

    const unlockAudio = () => {
        if (audio.paused) attemptPlay();
        document.removeEventListener('scroll', unlockAudio);
        document.removeEventListener('mousemove', unlockAudio);
        document.removeEventListener('touchstart', unlockAudio);
        document.removeEventListener('click', unlockAudio);
    };
    document.addEventListener('scroll', unlockAudio);
    document.addEventListener('mousemove', unlockAudio);
    document.addEventListener('touchstart', unlockAudio);
    document.addEventListener('click', unlockAudio);

    // 2. Background Transition on Scroll
    const body = document.body;
    const sections = document.querySelectorAll('header, section');
    const bgObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const id = entry.target.id;
                if (id === 'home') body.style.backgroundColor = 'var(--bg-home)';
                else if (id === 'life-story') body.style.backgroundColor = 'var(--bg-life)';
                else if (id === 'tributes') body.style.backgroundColor = 'var(--bg-tributes)';
                else if (id === 'service') body.style.backgroundColor = 'var(--bg-service)';
            }
        });
    }, { threshold: 0.3 });
    sections.forEach(section => bgObserver.observe(section));

    // 3. Floating Reveal Animations
    const revealElements = document.querySelectorAll('.reveal');
    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) entry.target.classList.add('active');
        });
    }, { threshold: 0.1 });
    revealElements.forEach(el => revealObserver.observe(el));

    // 4. Tribute Logic (with Supabase Persistence)
    const tributeForm = document.getElementById('tributeForm');
    const tributeList = document.getElementById('tribute-list');
    const viewMoreBtn = document.getElementById('viewMoreTributes');

    // Supabase Configuration - PLEASE REPLACE THESE WITH YOUR OWN KEYS
    const SUPABASE_URL = 'YOUR_SUPABASE_URL';
    const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';
    
    let supabaseClient = null;
    if (typeof supabase !== 'undefined' && SUPABASE_URL !== 'YOUR_SUPABASE_URL') {
        supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }

    async function loadTributes() {
        if (!supabaseClient) {
            console.warn("Supabase not initialized. Tributes will not be persistent.");
            return;
        }

        const { data, error } = await supabaseClient
            .from('tributes')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching tributes:', error);
            return;
        }

        if (data) {
            tributeList.innerHTML = ''; // Clear existing
            data.forEach((tribute, index) => {
                const tributeItem = createTributeElement(tribute.name, tribute.message, index);
                tributeList.appendChild(tributeItem);
            });
            rebalanceTributes();
        }
    }

    function createTributeElement(name, message, index) {
        const item = document.createElement('div');
        item.className = `tribute-item reveal active ${index % 2 === 0 ? 'tribute-left' : 'tribute-right'}`;
        item.innerHTML = `<div class="tribute-card"><p class="tribute-text">"${message}"</p><p class="small text-uppercase letter-spacing-1 mt-3">${name}</p></div>`;
        return item;
    }

    if (tributeForm) {
        tributeForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('tributeName').value;
            const message = document.getElementById('tributeMessage').value;
            const submitBtn = tributeForm.querySelector('button');

            if (supabaseClient) {
                submitBtn.disabled = true;
                submitBtn.innerText = 'Posting...';

                const { error } = await supabaseClient
                    .from('tributes')
                    .insert([{ name, message }]);

                if (error) {
                    alert('Error posting tribute. Please try again.');
                    console.error(error);
                    submitBtn.disabled = false;
                    submitBtn.innerText = 'Post Message';
                    return;
                }
                
                // Reload tributes to show the new one
                await loadTributes();
                submitBtn.disabled = false;
                submitBtn.innerText = 'Post Message';
            } else {
                // Fallback for local-only if Supabase is not configured
                const newTributeItem = createTributeElement(name, message, 0);
                tributeList.insertBefore(newTributeItem, tributeList.firstChild);
                rebalanceTributes();
            }
            
            tributeForm.reset();
        });
    }

    function rebalanceTributes() {
        const items = tributeList.querySelectorAll('.tribute-item');
        items.forEach((item, index) => {
            item.classList.remove('tribute-left', 'tribute-right');
            item.classList.add(index % 2 === 0 ? 'tribute-left' : 'tribute-right');
            if (index >= 4) {
                item.style.display = 'none';
                if(viewMoreBtn) viewMoreBtn.style.display = 'inline-block';
            } else {
                item.style.display = 'block';
            }
        });
    }

    if (viewMoreBtn) {
        viewMoreBtn.addEventListener('click', () => {
            tributeList.querySelectorAll('.tribute-item[style*="display: none"]').forEach(item => {
                item.style.display = 'block';
                item.classList.add('active');
            });
            viewMoreBtn.style.display = 'none';
        });
    }

    // Initial Load
    loadTributes();
});
