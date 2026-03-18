fetch('../Blog/blog-posts.json')
  .then(res => res.json())
  .then(posts => {
    const blogContainer = document.getElementById('blog-container');
    const categoryList = document.getElementById('category-list');
    const recentPosts = document.getElementById('recent-posts');
    const tagCloud = document.getElementById('tag-cloud');

    const categories = {};
    const tagsSet = new Set();

    posts.forEach((post, index) => {
      blogContainer.innerHTML += `
        <div class="col-md-4 mb-4">
          <div class="card h-100 shadow-sm">
            <img src="${post.image}" class="card-img-top" alt="${post.title}">
            <div class="card-body d-flex flex-column">
              <h5 class="card-title">${post.title}</h5>
              <p class="card-text"><small class="text-muted">${post.date}</small></p>
              <a href="${post.url}" class="btn btn-primary mt-auto">Leer más</a>
            </div>
          </div>
        </div>
      `;

      categories[post.category] = (categories[post.category] || 0) + 1;

      if (index < 3) {
        recentPosts.innerHTML += `
          <a class="d-flex align-items-center text-decoration-none mb-3" href="${post.url}">
            <img src="${post.image}" class="img-fluid rounded" style="width: 60px; height: 60px; object-fit: cover;">
            <div class="pl-3">
              <h6 class="m-0">${post.title}</h6>
              <small class="text-muted">${post.date}</small>
            </div>
          </a>
        `;
      }

      if (Array.isArray(post.tags)) {
        post.tags.forEach(tag => tagsSet.add(tag));
      }
    });

    Object.entries(categories).forEach(([name, count]) => {
      categoryList.innerHTML += `
        <li class="list-group-item d-flex justify-content-between align-items-center px-0">
          <span>${name}</span>
          <span class="badge badge-primary badge-pill">${count}</span>
        </li>
      `;
    });

    tagsSet.forEach(tag => {
      tagCloud.innerHTML += `<a href="#" class="btn btn-outline-primary btn-sm m-1">${tag}</a>`;
    });
  })
  .catch(err => console.error("Error al cargar blog-posts.json:", err));
